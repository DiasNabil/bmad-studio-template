// src/workflow/WorkflowExecutor.ts
import { EventEmitter } from 'events';
import { ParallelCoordinator } from './coordinator';
import { WorkflowParser } from './parser';
import {
    WorkflowDefinition,
    WorkflowContext,
    StepResult,
    ValidationGate,
    ValidationResult,
    Domain,
    CoordinationResult,
    WorkflowStatus,
} from './types';

/**
 * WorkflowExecutor - Core engine for executing BMAD workflows
 */
export class WorkflowExecutor extends EventEmitter {
    private parser: WorkflowParser;
    private coordinator: ParallelCoordinator;
    private runningWorkflows: Map<string, WorkflowState> = new Map();

    constructor() {
        super();
        this.parser = new WorkflowParser();
        this.coordinator = new ParallelCoordinator();
    }

    /**
     * Load workflow from YAML file
     */
    async loadWorkflow(id: string): Promise<WorkflowDefinition> {
        try {
            // Try to find workflow file in .bmad-core/workflows/
            const workflowPath = `.bmad-core/workflows/${id}.yaml`;
            const workflow = this.parser.parseWorkflowFile(workflowPath);

            this.emit('workflow_loaded', { workflowId: id, workflow });
            return workflow;
        } catch (error) {
            // Try alternative path or create default workflow
            const fallbackWorkflow: WorkflowDefinition = {
                id,
                name: `Dynamic Workflow ${id}`,
                version: '1.0.0',
                steps: [],
            };

            this.emit('workflow_created', { workflowId: id, workflow: fallbackWorkflow });
            return fallbackWorkflow;
        }
    }

    /**
     * Execute a single workflow step
     */
    async executeStep(stepId: string, context: WorkflowContext): Promise<StepResult> {
        try {
            this.emit('step_started', { stepId, context });

            // Simulate step execution (in real implementation, this would call the actual agent/handler)
            const executionResult = await this.performStepExecution(stepId, context);

            const result: StepResult = {
                stepId,
                status: 'success',
                output: executionResult,
            };

            this.emit('step_completed', { stepId, result });
            return result;
        } catch (error) {
            const errorResult: StepResult = {
                stepId,
                status: 'failure',
                error: error instanceof Error ? error.message : String(error),
            };

            this.emit('step_failed', { stepId, error: errorResult.error });
            return errorResult;
        }
    }

    /**
     * Validate workflow gates before proceeding
     */
    async validateGates(gates: ValidationGate[]): Promise<ValidationResult> {
        const failedGates: ValidationGate[] = [];

        for (const gate of gates) {
            try {
                const mockContext: WorkflowContext = {
                    workflowId: 'validation-context',
                    initiator: 'system',
                    metadata: {},
                };

                const passed = await gate.condition(mockContext);
                if (!passed) {
                    failedGates.push(gate);
                }
            } catch (error) {
                failedGates.push(gate);
            }
        }

        const result: ValidationResult = {
            passed: failedGates.length === 0,
            failedGates,
        };

        this.emit('validation_completed', result);
        return result;
    }

    /**
     * Coordinate parallel execution of domains
     */
    async coordinateParallel(domains: Domain[]): Promise<CoordinationResult> {
        this.emit('parallel_coordination_started', { domains: domains.map((d) => d.id) });

        const result = await this.coordinator.coordinateDomains(domains);

        this.emit('parallel_coordination_completed', result);
        return result;
    }

    /**
     * Start workflow execution
     */
    async startWorkflow(workflowId: string, context: WorkflowContext): Promise<void> {
        const workflow = await this.loadWorkflow(workflowId);
        const workflowState: WorkflowState = {
            workflow,
            context,
            status: WorkflowStatus.RUNNING,
            currentStepIndex: 0,
            stepResults: [],
        };

        this.runningWorkflows.set(workflowId, workflowState);
        this.emit('workflow_started', { workflowId, workflow });

        try {
            // Execute workflow steps
            for (let i = 0; i < workflow.steps.length; i++) {
                const step = workflow.steps[i];
                workflowState.currentStepIndex = i;

                if (step.type === 'parallel') {
                    // Handle parallel execution
                    const parallelDomains: Domain[] = [
                        {
                            id: step.id,
                            handler: async (ctx) => await this.executeStep(step.id, ctx),
                        },
                    ];

                    await this.coordinateParallel(parallelDomains);
                } else {
                    // Handle sequential execution
                    const stepResult = await this.executeStep(step.id, context);
                    workflowState.stepResults.push(stepResult);

                    if (stepResult.status === 'failure') {
                        workflowState.status = WorkflowStatus.FAILED;
                        this.emit('workflow_failed', { workflowId, error: stepResult.error });
                        return;
                    }
                }
            }

            workflowState.status = WorkflowStatus.COMPLETED;
            this.emit('workflow_completed', { workflowId, results: workflowState.stepResults });
        } catch (error) {
            workflowState.status = WorkflowStatus.FAILED;
            this.emit('workflow_failed', {
                workflowId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Pause workflow execution
     */
    async pauseWorkflow(workflowId: string): Promise<void> {
        const workflowState = this.runningWorkflows.get(workflowId);
        if (workflowState && workflowState.status === WorkflowStatus.RUNNING) {
            workflowState.status = WorkflowStatus.PAUSED;
            this.emit('workflow_paused', { workflowId });
        }
    }

    /**
     * Resume paused workflow
     */
    async resumeWorkflow(workflowId: string): Promise<void> {
        const workflowState = this.runningWorkflows.get(workflowId);
        if (workflowState && workflowState.status === WorkflowStatus.PAUSED) {
            workflowState.status = WorkflowStatus.RUNNING;
            this.emit('workflow_resumed', { workflowId });
            // Continue execution from current step
            // Implementation would depend on specific requirements
        }
    }

    /**
     * Get current workflow status
     */
    getWorkflowStatus(workflowId: string): WorkflowStatus | null {
        const workflowState = this.runningWorkflows.get(workflowId);
        return workflowState?.status || null;
    }

    /**
     * Get detailed workflow state
     */
    getWorkflowState(workflowId: string): WorkflowState | null {
        return this.runningWorkflows.get(workflowId) || null;
    }

    /**
     * List all active workflows
     */
    listActiveWorkflows(): string[] {
        return Array.from(this.runningWorkflows.keys());
    }

    /**
     * Private method to perform actual step execution
     */
    private async performStepExecution(stepId: string, context: WorkflowContext): Promise<any> {
        // This would integrate with the BMAD agent system
        // For now, simulate execution
        await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async work

        return {
            stepId,
            timestamp: new Date().toISOString(),
            context: context.workflowId,
            message: `Step ${stepId} executed successfully`,
        };
    }
}

/**
 * Internal workflow state tracking
 */
interface WorkflowState {
    workflow: WorkflowDefinition;
    context: WorkflowContext;
    status: WorkflowStatus;
    currentStepIndex: number;
    stepResults: StepResult[];
}

// Export singleton instance
export const workflowExecutor = new WorkflowExecutor();
