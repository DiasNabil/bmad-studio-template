// src/api/RuntimeOrchestrator.ts
import { EventEmitter } from 'events';
import { parallelCoordinator } from '../workflow/coordinator';
import { workflowExecutor } from '../workflow/WorkflowExecutor';
import { auditController } from './controllers/auditController';
import { metricsController } from './controllers/metricsController';

/**
 * Agent information interface
 */
interface BMadAgent {
    id: string;
    name: string;
    type: string;
    status: 'active' | 'inactive' | 'busy' | 'error';
    capabilities: string[];
    currentTask?: string;
    lastActivity: Date;
    performance: {
        tasksCompleted: number;
        averageResponseTime: number;
        errorRate: number;
    };
}

/**
 * Coordination result interface
 */
interface CoordinationResult {
    success: boolean;
    agents: BMadAgent[];
    executionTime: number;
    metrics: {
        totalTasks: number;
        completedTasks: number;
        failedTasks: number;
    };
}

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
    timestamp: string;
    system: {
        cpu: number;
        memory: number;
        uptime: number;
    };
    workflows: {
        active: number;
        completed: number;
        failed: number;
        averageExecutionTime: number;
    };
    agents: {
        total: number;
        active: number;
        busy: number;
        errors: number;
    };
}

/**
 * Resource optimization interface
 */
interface ResourceOptimization {
    recommendations: string[];
    estimatedImprovement: {
        cpu: number;
        memory: number;
        throughput: number;
    };
    actions: Array<{
        type: 'scale_up' | 'scale_down' | 'redistribute' | 'cache_optimize';
        target: string;
        priority: 'high' | 'medium' | 'low';
    }>;
}

/**
 * RuntimeOrchestrator - Main orchestrator for BMAD runtime coordination
 */
export class RuntimeOrchestrator extends EventEmitter {
    private agents: Map<string, BMadAgent> = new Map();
    private startTime: number = Date.now();
    private monitoringInterval?: NodeJS.Timeout;
    private optimizationInterval?: NodeJS.Timeout;

    constructor() {
        super();
        this.initializeAgents();
        this.startMonitoring();
        this.setupEventListeners();
    }

    /**
     * Coordinate multiple agents for parallel execution
     */
    async coordinateAgents(agents: BMadAgent[]): Promise<CoordinationResult> {
        const startTime = Date.now();
        this.emit('coordination_started', { agentCount: agents.length });

        try {
            // Update agent status to busy
            agents.forEach((agent) => {
                agent.status = 'busy';
                agent.currentTask = `coordination_${startTime}`;
                this.agents.set(agent.id, agent);
            });

            // Create coordination domains for each agent
            const domains = agents.map((agent) => ({
                id: agent.id,
                handler: async (context: any) => {
                    return await this.executeAgentTask(agent, context);
                },
            }));

            // Use parallel coordinator for execution
            const coordinationResult = await parallelCoordinator.coordinateDomains(domains);

            const executionTime = Date.now() - startTime;

            // Update agent performance metrics
            agents.forEach((agent) => {
                const agentResult = coordinationResult.domainResults[agent.id];
                if (agentResult) {
                    agent.performance.tasksCompleted++;
                    agent.performance.averageResponseTime =
                        (agent.performance.averageResponseTime + executionTime) / 2;
                    agent.status = 'active';
                } else {
                    agent.performance.errorRate++;
                    agent.status = 'error';
                }
                agent.lastActivity = new Date();
                agent.currentTask = undefined;
                this.agents.set(agent.id, agent);
            });

            const result: CoordinationResult = {
                success: Object.keys(coordinationResult.errors).length === 0,
                agents,
                executionTime,
                metrics: {
                    totalTasks: agents.length,
                    completedTasks: Object.keys(coordinationResult.domainResults).length,
                    failedTasks: Object.keys(coordinationResult.errors).length,
                },
            };

            // Log coordination metrics
            metricsController.recordMetric('coordination_execution_time', executionTime);
            metricsController.incrementMetric('coordination_total');
            if (result.success) {
                metricsController.incrementMetric('coordination_success');
            } else {
                metricsController.incrementMetric('coordination_failed');
            }

            // Audit coordination
            auditController.logAuditEntry({
                timestamp: new Date().toISOString(),
                action: 'agent_coordination',
                resource: `agents:${agents.map((a) => a.id).join(',')}`,
                user: 'orchestrator',
                details: {
                    agentCount: agents.length,
                    executionTime,
                    success: result.success,
                },
                result: result.success ? 'success' : 'failure',
            });

            this.emit('coordination_completed', result);
            return result;
        } catch (error) {
            // Handle coordination failure
            agents.forEach((agent) => {
                agent.status = 'error';
                agent.currentTask = undefined;
                agent.performance.errorRate++;
                this.agents.set(agent.id, agent);
            });

            metricsController.incrementMetric('coordination_failed');

            const errorResult: CoordinationResult = {
                success: false,
                agents,
                executionTime: Date.now() - startTime,
                metrics: {
                    totalTasks: agents.length,
                    completedTasks: 0,
                    failedTasks: agents.length,
                },
            };

            this.emit('coordination_failed', { error, result: errorResult });
            throw error;
        }
    }

    /**
     * Monitor system performance continuously
     */
    monitorPerformance(): PerformanceMetrics {
        const memUsage = process.memoryUsage();
        const activeWorkflows = workflowExecutor.listActiveWorkflows();

        const agents = Array.from(this.agents.values());
        const activeAgents = agents.filter((a) => a.status === 'active').length;
        const busyAgents = agents.filter((a) => a.status === 'busy').length;
        const errorAgents = agents.filter((a) => a.status === 'error').length;

        const metrics: PerformanceMetrics = {
            timestamp: new Date().toISOString(),
            system: {
                cpu: this.getCpuUsage(),
                memory: (memUsage.heapUsed / memUsage.heapTotal) * 100,
                uptime: Date.now() - this.startTime,
            },
            workflows: {
                active: activeWorkflows.length,
                completed: this.getCompletedWorkflowCount(),
                failed: this.getFailedWorkflowCount(),
                averageExecutionTime: this.getAverageWorkflowExecutionTime(),
            },
            agents: {
                total: agents.length,
                active: activeAgents,
                busy: busyAgents,
                errors: errorAgents,
            },
        };

        // Record metrics
        metricsController.recordMetric('system_cpu_usage', metrics.system.cpu);
        metricsController.recordMetric('system_memory_usage', metrics.system.memory);
        metricsController.recordMetric('agents_active', metrics.agents.active);
        metricsController.recordMetric('workflows_active', metrics.workflows.active);

        this.emit('performance_monitored', metrics);
        return metrics;
    }

    /**
     * Handle failover when an agent fails
     */
    async handleFailover(failedAgentId: string): Promise<void> {
        const failedAgent = this.agents.get(failedAgentId);
        if (!failedAgent) {
            throw new Error(`Agent ${failedAgentId} not found`);
        }

        this.emit('failover_started', { agentId: failedAgentId });

        try {
            // Mark agent as failed
            failedAgent.status = 'error';
            failedAgent.lastActivity = new Date();
            this.agents.set(failedAgentId, failedAgent);

            // Find replacement agent
            const availableAgents = Array.from(this.agents.values()).filter(
                (a) =>
                    a.status === 'active' &&
                    a.capabilities.some((cap) => failedAgent.capabilities.includes(cap))
            );

            if (availableAgents.length > 0) {
                const replacementAgent = availableAgents[0];

                // Transfer current task if exists
                if (failedAgent.currentTask) {
                    replacementAgent.currentTask = failedAgent.currentTask;
                    replacementAgent.status = 'busy';
                    this.agents.set(replacementAgent.id, replacementAgent);
                }

                auditController.logAuditEntry({
                    timestamp: new Date().toISOString(),
                    action: 'agent_failover',
                    resource: `agent:${failedAgentId}`,
                    user: 'orchestrator',
                    details: {
                        failedAgent: failedAgentId,
                        replacementAgent: replacementAgent.id,
                        task: failedAgent.currentTask,
                    },
                    result: 'success',
                });

                this.emit('failover_completed', {
                    failedAgent: failedAgentId,
                    replacementAgent: replacementAgent.id,
                });
            } else {
                throw new Error('No available replacement agents found');
            }
        } catch (error) {
            auditController.logAuditEntry({
                timestamp: new Date().toISOString(),
                action: 'agent_failover',
                resource: `agent:${failedAgentId}`,
                user: 'orchestrator',
                details: { error: error instanceof Error ? error.message : String(error) },
                result: 'failure',
            });

            this.emit('failover_failed', { agentId: failedAgentId, error });
            throw error;
        }
    }

    /**
     * Optimize resource usage based on current metrics
     */
    optimizeResourceUsage(): ResourceOptimization {
        const metrics = this.monitorPerformance();
        const recommendations: string[] = [];
        const actions: ResourceOptimization['actions'] = [];

        // CPU optimization
        if (metrics.system.cpu > 80) {
            recommendations.push(
                'High CPU usage detected - consider scaling up or optimizing workflows'
            );
            actions.push({
                type: 'scale_up',
                target: 'cpu',
                priority: 'high',
            });
        }

        // Memory optimization
        if (metrics.system.memory > 85) {
            recommendations.push(
                'High memory usage - consider implementing caching or memory cleanup'
            );
            actions.push({
                type: 'cache_optimize',
                target: 'memory',
                priority: 'high',
            });
        }

        // Agent optimization
        if (metrics.agents.errors > metrics.agents.total * 0.2) {
            recommendations.push(
                'High agent error rate - check agent health and restart failed agents'
            );
            actions.push({
                type: 'redistribute',
                target: 'agents',
                priority: 'medium',
            });
        }

        // Workflow optimization
        if (metrics.workflows.active > 10) {
            recommendations.push('Many active workflows - consider implementing workflow queuing');
            actions.push({
                type: 'redistribute',
                target: 'workflows',
                priority: 'medium',
            });
        }

        const optimization: ResourceOptimization = {
            recommendations,
            estimatedImprovement: {
                cpu: recommendations.length > 0 ? 15 : 0,
                memory: actions.some((a) => a.target === 'memory') ? 20 : 0,
                throughput: actions.length > 0 ? 10 : 0,
            },
            actions,
        };

        this.emit('optimization_analyzed', optimization);
        return optimization;
    }

    /**
     * Get all registered agents
     */
    getAgents(): BMadAgent[] {
        return Array.from(this.agents.values());
    }

    /**
     * Get agent by ID
     */
    getAgent(id: string): BMadAgent | undefined {
        return this.agents.get(id);
    }

    /**
     * Register a new agent
     */
    registerAgent(agent: BMadAgent): void {
        this.agents.set(agent.id, agent);
        this.emit('agent_registered', agent);
    }

    /**
     * Unregister an agent
     */
    unregisterAgent(id: string): boolean {
        const removed = this.agents.delete(id);
        if (removed) {
            this.emit('agent_unregistered', { agentId: id });
        }
        return removed;
    }

    /**
     * Shutdown orchestrator
     */
    async shutdown(): Promise<void> {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        if (this.optimizationInterval) {
            clearInterval(this.optimizationInterval);
        }

        auditController.logAuditEntry({
            timestamp: new Date().toISOString(),
            action: 'orchestrator_shutdown',
            resource: 'runtime_orchestrator',
            user: 'system',
            details: { uptime: Date.now() - this.startTime },
            result: 'success',
        });

        this.emit('orchestrator_shutdown');
    }

    /**
     * Initialize default agents
     */
    private initializeAgents(): void {
        const defaultAgents: BMadAgent[] = [
            {
                id: 'bmad-orchestrator',
                name: 'BMAD Orchestrator',
                type: 'orchestrator',
                status: 'active',
                capabilities: ['coordination', 'workflow_management', 'monitoring'],
                lastActivity: new Date(),
                performance: {
                    tasksCompleted: 0,
                    averageResponseTime: 0,
                    errorRate: 0,
                },
            },
            {
                id: 'workflow-executor',
                name: 'Workflow Executor',
                type: 'executor',
                status: 'active',
                capabilities: ['workflow_execution', 'step_processing', 'validation'],
                lastActivity: new Date(),
                performance: {
                    tasksCompleted: 0,
                    averageResponseTime: 0,
                    errorRate: 0,
                },
            },
            {
                id: 'parallel-coordinator',
                name: 'Parallel Coordinator',
                type: 'coordinator',
                status: 'active',
                capabilities: [
                    'parallel_execution',
                    'domain_coordination',
                    'dependency_management',
                ],
                lastActivity: new Date(),
                performance: {
                    tasksCompleted: 0,
                    averageResponseTime: 0,
                    errorRate: 0,
                },
            },
        ];

        defaultAgents.forEach((agent) => {
            this.agents.set(agent.id, agent);
        });
    }

    /**
     * Start continuous monitoring
     */
    private startMonitoring(): void {
        // Performance monitoring every 30 seconds
        this.monitoringInterval = setInterval(() => {
            this.monitorPerformance();
        }, 30000);

        // Resource optimization every 5 minutes
        this.optimizationInterval = setInterval(() => {
            this.optimizeResourceUsage();
        }, 300000);
    }

    /**
     * Setup event listeners for workflow and coordination events
     */
    private setupEventListeners(): void {
        // Listen to workflow events
        workflowExecutor.on('workflow_started', (data) => {
            this.emit('workflow_event', { type: 'started', data });
        });

        workflowExecutor.on('workflow_completed', (data) => {
            this.emit('workflow_event', { type: 'completed', data });
        });

        workflowExecutor.on('workflow_failed', (data) => {
            this.emit('workflow_event', { type: 'failed', data });
        });

        // Listen to coordination events
        parallelCoordinator.on('coordination_started', (data) => {
            this.emit('coordination_event', { type: 'started', data });
        });

        parallelCoordinator.on('coordination_completed', (data) => {
            this.emit('coordination_event', { type: 'completed', data });
        });
    }

    /**
     * Execute task for a specific agent
     */
    private async executeAgentTask(agent: BMadAgent, _context: any): Promise<any> {
        // Simulate agent task execution
        const executionTime = Math.random() * 1000 + 500; // 500-1500ms
        await new Promise((resolve) => setTimeout(resolve, executionTime));

        return {
            agentId: agent.id,
            executionTime,
            result: 'Task completed successfully',
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Get CPU usage (placeholder)
     */
    private getCpuUsage(): number {
        // In real implementation, use actual CPU monitoring
        return Math.random() * 100;
    }

    /**
     * Get completed workflow count
     */
    private getCompletedWorkflowCount(): number {
        // This should be tracked by the workflow executor
        return 0;
    }

    /**
     * Get failed workflow count
     */
    private getFailedWorkflowCount(): number {
        // This should be tracked by the workflow executor
        return 0;
    }

    /**
     * Get average workflow execution time
     */
    private getAverageWorkflowExecutionTime(): number {
        // This should be calculated from workflow execution history
        return 0;
    }
}

// Export singleton instance
export const runtimeOrchestrator = new RuntimeOrchestrator();
