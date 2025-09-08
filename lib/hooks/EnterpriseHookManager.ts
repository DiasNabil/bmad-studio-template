import { Logger, LogLevel } from '../core/Logger';
import { hookMetrics } from './metrics';

// Hook Event Types
export enum HookEventType {
    ON_PRD_VALIDATED = 'onPRDValidated',
    ON_WORKFLOW_GATE_PASSED = 'onWorkflowGatePassed',
    ON_DEPLOY_SUCCESS = 'onDeploySuccess',
    ON_CRITICAL_ERROR = 'onCriticalError',
    ON_AGENT_COMPLETE = 'onAgentComplete',
    ON_SPRINT_START = 'onSprintStart',
    ON_SECURITY_SCAN = 'onSecurityScan',
    ON_PERFORMANCE_ALERT = 'onPerformanceAlert',
}

// Hook Priority Levels
export enum HookPriority {
    CRITICAL = 1,
    HIGH = 2,
    MEDIUM = 3,
    LOW = 4,
}

// Hook Execution Status
export enum HookStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    SUCCESS = 'success',
    FAILED = 'failed',
    TIMEOUT = 'timeout',
    SKIPPED = 'skipped',
}

// Hook Configuration Interface
export interface HookConfig {
    name: string;
    handler: HookHandler;
    priority: HookPriority;
    timeout: number; // in milliseconds
    retries: number;
    budget: HookBudget;
    isolation: boolean;
    conditions?: HookCondition[];
}

// Hook Budget Interface
export interface HookBudget {
    maxExecutionTime: number; // ms per hour
    maxConcurrentExecutions: number;
    maxMemoryUsage: number; // MB
    maxCpuUsage: number; // percentage
}

// Hook Condition Interface
export interface HookCondition {
    check: (context: HookContext) => boolean;
    description: string;
}

// Hook Context Interface
export interface HookContext {
    eventType: HookEventType;
    payload: Record<string, unknown>;
    metadata: {
        timestamp: Date;
        executionId: string;
        userId?: string;
        projectId?: string;
        traceId?: string;
    };
    budget: HookBudget;
    retryCount: number;
}

// Hook Handler Interface
export interface HookHandler {
    (context: HookContext): Promise<HookResult>;
}

// Hook Result Interface
export interface HookResult {
    status: HookStatus;
    data?: Record<string, unknown>;
    error?: Error;
    duration: number;
    resourceUsage?: {
        memory: number;
        cpu: number;
    };
}

// Hook Execution Record
export interface HookExecution {
    executionId: string;
    hookName: string;
    eventType: HookEventType;
    status: HookStatus;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    retryCount: number;
    result?: HookResult;
    resourceUsage?: {
        memory: number;
        cpu: number;
    };
}

// Enterprise Hook Manager Implementation
export class EnterpriseHookManager {
    private static instance: EnterpriseHookManager;
    private hooks: Map<HookEventType, HookConfig[]> = new Map();
    private executions: Map<string, HookExecution> = new Map();
    private runningExecutions: Set<string> = new Set();
    private budgetTracker: Map<string, { usage: number; resetTime: Date }> = new Map();
    private logger: Logger;

    private constructor() {
        this.logger = Logger.getInstance();
        this.logger.setLogLevel(LogLevel.INFO);
        this.initializeBudgetResetTimer();
    }

    public static getInstance(): EnterpriseHookManager {
        if (!EnterpriseHookManager.instance) {
            EnterpriseHookManager.instance = new EnterpriseHookManager();
        }
        return EnterpriseHookManager.instance;
    }

    // Register a hook for specific event type
    public registerHook(eventType: HookEventType, config: HookConfig): void {
        if (!this.hooks.has(eventType)) {
            this.hooks.set(eventType, []);
        }

        const hooks = this.hooks.get(eventType)!;

        // Remove existing hook with same name
        const existingIndex = hooks.findIndex((h) => h.name === config.name);
        if (existingIndex !== -1) {
            hooks.splice(existingIndex, 1);
            this.logger.warn(`Hook ${config.name} replaced for event ${eventType}`);
        }

        hooks.push(config);

        // Sort by priority (CRITICAL = 1, LOW = 4)
        hooks.sort((a, b) => a.priority - b.priority);

        this.logger.warn(
            `Hook ${config.name} registered for event ${eventType} with priority ${config.priority}`,
            {
                hookName: config.name,
                eventType,
                priority: config.priority,
                timeout: config.timeout,
                retries: config.retries,
            }
        );
    }

    // Unregister a hook
    public unregisterHook(eventType: HookEventType, hookName: string): boolean {
        const hooks = this.hooks.get(eventType);
        if (!hooks) return false;

        const initialLength = hooks.length;
        const filtered = hooks.filter((h) => h.name !== hookName);
        this.hooks.set(eventType, filtered);

        const removed = filtered.length < initialLength;
        if (removed) {
            this.logger.warn(`Hook ${hookName} unregistered from event ${eventType}`);
        }

        return removed;
    }

    // Execute all hooks for a specific event
    public async executeHooks(
        eventType: HookEventType,
        payload: Record<string, unknown>,
        metadata?: Partial<HookContext['metadata']>
    ): Promise<HookResult[]> {
        const hooks = this.hooks.get(eventType) || [];
        if (hooks.length === 0) {
            this.logger.warn(`No hooks registered for event ${eventType}`);
            return [];
        }

        this.logger.warn(`Executing ${hooks.length} hooks for event ${eventType}`);

        const context: HookContext = {
            eventType,
            payload,
            metadata: {
                timestamp: new Date(),
                executionId: this.generateExecutionId(),
                userId: metadata?.userId,
                projectId: metadata?.projectId,
                traceId: metadata?.traceId || this.generateExecutionId(),
            },
            budget: {
                maxExecutionTime: 30000,
                maxConcurrentExecutions: 5,
                maxMemoryUsage: 512,
                maxCpuUsage: 80,
            },
            retryCount: 0,
        };

        const results: HookResult[] = [];

        // Execute hooks based on priority and isolation settings
        for (const hook of hooks) {
            try {
                // Check conditions before execution
                if (hook.conditions && !this.checkConditions(hook.conditions, context)) {
                    results.push({
                        status: HookStatus.SKIPPED,
                        duration: 0,
                    });
                    continue;
                }

                // Check budget constraints
                if (!this.checkBudget(hook)) {
                    this.logger.error(`Hook ${hook.name} exceeded budget constraints`);
                    results.push({
                        status: HookStatus.FAILED,
                        error: new Error('Budget exceeded'),
                        duration: 0,
                    });
                    continue;
                }

                const result = await this.executeHookWithRetry(hook, context);
                results.push(result);
            } catch (error) {
                this.logger.error(`Failed to execute hook ${hook.name}`, {
                    error: error instanceof Error ? error.message : String(error),
                });
                results.push({
                    status: HookStatus.FAILED,
                    error: error instanceof Error ? error : new Error(String(error)),
                    duration: 0,
                });
            }
        }

        return results;
    }

    // Execute a single hook with retry logic
    private async executeHookWithRetry(
        config: HookConfig,
        context: HookContext
    ): Promise<HookResult> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= config.retries; attempt++) {
            const executionId = this.generateExecutionId();
            const execution: HookExecution = {
                executionId,
                hookName: config.name,
                eventType: context.eventType,
                status: HookStatus.PENDING,
                startTime: new Date(),
                retryCount: attempt,
            };

            this.executions.set(executionId, execution);

            try {
                const result = await this.executeHookSafely(config, {
                    ...context,
                    retryCount: attempt,
                });

                execution.status = result.status;
                execution.endTime = new Date();
                execution.duration = result.duration;
                execution.result = result;
                execution.resourceUsage = result.resourceUsage;

                // Record metrics
                hookMetrics.recordHookExecution(
                    config.name,
                    context.eventType,
                    result.duration,
                    result.status === HookStatus.SUCCESS
                );

                if (result.status === HookStatus.SUCCESS) {
                    return result;
                }

                lastError = result.error;
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                lastError = err;

                execution.status = HookStatus.FAILED;
                execution.endTime = new Date();
                execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

                this.logger.error(`Hook ${config.name} attempt ${attempt + 1} failed`, {
                    error: err.message,
                    executionId,
                });
            }

            // Wait before retry (exponential backoff)
            if (attempt < config.retries) {
                const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
                await this.sleep(delay);
            }
        }

        return {
            status: HookStatus.FAILED,
            error: lastError || new Error('Maximum retries exceeded'),
            duration: 0,
        };
    }

    // Execute hook safely with timeout and isolation
    private async executeHookSafely(config: HookConfig, context: HookContext): Promise<HookResult> {
        const startTime = Date.now();

        return new Promise<HookResult>((resolve, reject) => {
            const timeout = setTimeout(() => {
                hookMetrics.recordHookTimeout(config.name, context.eventType);
                reject(new Error(`Hook ${config.name} timed out after ${config.timeout}ms`));
            }, config.timeout);

            const executeHook = async (): Promise<void> => {
                try {
                    this.runningExecutions.add(context.metadata.executionId);

                    // Update budget usage
                    this.updateBudgetUsage(config.name, Date.now() - startTime);

                    const result = await config.handler(context);
                    result.duration = Date.now() - startTime;

                    clearTimeout(timeout);
                    this.runningExecutions.delete(context.metadata.executionId);
                    resolve(result);
                } catch (error) {
                    clearTimeout(timeout);
                    this.runningExecutions.delete(context.metadata.executionId);
                    reject(error);
                }
            };

            if (config.isolation) {
                // Execute in isolated context (simplified implementation)
                this.executeInIsolation(executeHook).catch(reject);
            } else {
                executeHook().catch(reject);
            }
        });
    }

    // Execute hook in isolated context (simplified implementation)
    private async executeInIsolation(fn: () => Promise<void>): Promise<void> {
        // In a real implementation, this would use worker threads or similar
        // For now, we'll just execute normally but track resource usage
        const startMemory = process.memoryUsage();

        try {
            await fn();
        } finally {
            const endMemory = process.memoryUsage();
            this.logger.warn('Hook executed in isolation', {
                memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
            });
        }
    }

    // Check hook conditions
    private checkConditions(conditions: HookCondition[], context: HookContext): boolean {
        return conditions.every((condition) => {
            try {
                return condition.check(context);
            } catch (error) {
                this.logger.error(`Condition check failed: ${condition.description}`, {
                    error: error instanceof Error ? error.message : String(error),
                });
                return false;
            }
        });
    }

    // Check budget constraints
    private checkBudget(config: HookConfig): boolean {
        const tracker = this.budgetTracker.get(config.name);
        if (!tracker) {
            return true; // No tracking yet, allow execution
        }

        // Check if budget period has reset
        if (tracker.resetTime <= new Date()) {
            tracker.usage = 0;
            tracker.resetTime = new Date(Date.now() + 3600000); // Reset every hour
        }

        // Check concurrent executions
        const runningCount = Array.from(this.runningExecutions).length;
        if (runningCount >= config.budget.maxConcurrentExecutions) {
            return false;
        }

        return tracker.usage < config.budget.maxExecutionTime;
    }

    // Update budget usage
    private updateBudgetUsage(hookName: string, duration: number): void {
        if (!this.budgetTracker.has(hookName)) {
            this.budgetTracker.set(hookName, {
                usage: 0,
                resetTime: new Date(Date.now() + 3600000),
            });
        }

        const tracker = this.budgetTracker.get(hookName)!;
        tracker.usage += duration;
    }

    // Initialize budget reset timer
    private initializeBudgetResetTimer(): void {
        setInterval(() => {
            const now = new Date();
            const entries = Array.from(this.budgetTracker.entries());
            for (const [hookName, tracker] of entries) {
                if (tracker.resetTime <= now) {
                    tracker.usage = 0;
                    tracker.resetTime = new Date(now.getTime() + 3600000);
                    this.logger.warn(`Budget reset for hook ${hookName}`);
                }
            }
        }, 300000); // Check every 5 minutes
    }

    // Get hook execution status
    public getExecutionStatus(executionId: string): HookExecution | undefined {
        return this.executions.get(executionId);
    }

    // Get all executions for an event type
    public getExecutionsByEventType(eventType: HookEventType): HookExecution[] {
        return Array.from(this.executions.values()).filter((exec) => exec.eventType === eventType);
    }

    // Get hooks statistics
    public getHooksStats(): {
        totalHooks: number;
        totalExecutions: number;
        runningExecutions: number;
        successRate: number;
        averageDuration: number;
    } {
        const executions = Array.from(this.executions.values());
        const successfulExecutions = executions.filter(
            (exec) => exec.status === HookStatus.SUCCESS
        );
        const completedExecutions = executions.filter((exec) => exec.duration !== undefined);

        return {
            totalHooks: Array.from(this.hooks.values()).reduce(
                (sum, hooks) => sum + hooks.length,
                0
            ),
            totalExecutions: executions.length,
            runningExecutions: this.runningExecutions.size,
            successRate:
                executions.length > 0 ? (successfulExecutions.length / executions.length) * 100 : 0,
            averageDuration:
                completedExecutions.length > 0
                    ? completedExecutions.reduce((sum, exec) => sum + (exec.duration || 0), 0) /
                      completedExecutions.length
                    : 0,
        };
    }

    // Utility methods
    private generateExecutionId(): string {
        return `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // Clean up old executions (retain last 1000)
    public cleanupExecutions(): void {
        const executions = Array.from(this.executions.entries());
        if (executions.length > 1000) {
            // Sort by start time and keep most recent 1000
            executions.sort(([, a], [, b]) => b.startTime.getTime() - a.startTime.getTime());

            this.executions.clear();
            executions.slice(0, 1000).forEach(([id, exec]) => {
                this.executions.set(id, exec);
            });

            this.logger.warn(
                `Cleaned up old hook executions, retained ${this.executions.size} entries`
            );
        }
    }
}

// Export default instance
export const enterpriseHookManager = EnterpriseHookManager.getInstance();

// Standard Hook Event Factory
export class StandardHooks {
    // PRD Validation Hook
    static createPRDValidationHook(): HookConfig {
        return {
            name: 'prd-validation-hook',
            handler: async (_context: HookContext) => {
                const startTime = Date.now();

                // Simulate PRD validation logic
                await new Promise((resolve) => setTimeout(resolve, 100));

                return {
                    status: HookStatus.SUCCESS,
                    duration: Date.now() - startTime,
                    data: { validated: true, timestamp: new Date().toISOString() },
                };
            },
            priority: HookPriority.HIGH,
            timeout: 10000,
            retries: 2,
            budget: {
                maxExecutionTime: 60000,
                maxConcurrentExecutions: 3,
                maxMemoryUsage: 256,
                maxCpuUsage: 50,
            },
            isolation: true,
        };
    }

    // Workflow Gate Hook
    static createWorkflowGateHook(): HookConfig {
        return {
            name: 'workflow-gate-hook',
            handler: async (_context: HookContext) => {
                const startTime = Date.now();

                // Simulate workflow gate validation
                await new Promise((resolve) => setTimeout(resolve, 200));

                return {
                    status: HookStatus.SUCCESS,
                    duration: Date.now() - startTime,
                    data: { gatePassed: true, nextStage: 'development' },
                };
            },
            priority: HookPriority.CRITICAL,
            timeout: 15000,
            retries: 3,
            budget: {
                maxExecutionTime: 120000,
                maxConcurrentExecutions: 2,
                maxMemoryUsage: 512,
                maxCpuUsage: 70,
            },
            isolation: true,
        };
    }

    // Deploy Success Hook
    static createDeploySuccessHook(): HookConfig {
        return {
            name: 'deploy-success-hook',
            handler: async (context: HookContext) => {
                const startTime = Date.now();

                // Simulate post-deployment actions
                await new Promise((resolve) => setTimeout(resolve, 300));

                return {
                    status: HookStatus.SUCCESS,
                    duration: Date.now() - startTime,
                    data: {
                        deployed: true,
                        environment: context.payload.environment || 'production',
                    },
                };
            },
            priority: HookPriority.HIGH,
            timeout: 20000,
            retries: 1,
            budget: {
                maxExecutionTime: 180000,
                maxConcurrentExecutions: 1,
                maxMemoryUsage: 1024,
                maxCpuUsage: 90,
            },
            isolation: false,
        };
    }

    // Critical Error Hook
    static createCriticalErrorHook(): HookConfig {
        return {
            name: 'critical-error-hook',
            handler: async (_context: HookContext) => {
                const startTime = Date.now();

                // Simulate error handling and alerting
                await new Promise((resolve) => setTimeout(resolve, 50));

                return {
                    status: HookStatus.SUCCESS,
                    duration: Date.now() - startTime,
                    data: { alertSent: true, severity: 'critical' },
                };
            },
            priority: HookPriority.CRITICAL,
            timeout: 5000,
            retries: 0,
            budget: {
                maxExecutionTime: 30000,
                maxConcurrentExecutions: 10,
                maxMemoryUsage: 128,
                maxCpuUsage: 30,
            },
            isolation: true,
        };
    }
}
