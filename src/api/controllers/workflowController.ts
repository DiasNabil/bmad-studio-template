// src/api/controllers/workflowController.ts
import { Request, Response } from 'express';
import { WorkflowStatus } from '../../workflow/types';
import { workflowExecutor } from '../../workflow/WorkflowExecutor';
import {
    StartWorkflowRequest,
    WorkflowStatusResponse,
    ApiResponse,
    HttpStatus,
    ApiErrorCode,
    StartWorkflowSchema,
} from '../types';
import { metricsController } from './metricsController';
import '../middleware/express-types';

/**
 * Workflow management controller
 */
export class WorkflowController {
    /**
     * POST /api/v1/workflow/start - Start a new workflow
     */
    async startWorkflow(req: Request, res: Response): Promise<void> {
        try {
            // Validate request body
            const validationResult = StartWorkflowSchema.safeParse(req.body);
            if (!validationResult.success) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    error: {
                        code: ApiErrorCode.VALIDATION_ERROR,
                        message: 'Invalid request body',
                        details: validationResult.error.errors,
                    },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                });
                return;
            }

            const { workflowId, context } = validationResult.data as StartWorkflowRequest;

            // Check if workflow is already running
            const currentStatus = workflowExecutor.getWorkflowStatus(workflowId);
            if (currentStatus === WorkflowStatus.RUNNING) {
                res.status(HttpStatus.CONFLICT).json({
                    success: false,
                    error: {
                        code: ApiErrorCode.WORKFLOW_ALREADY_RUNNING,
                        message: `Workflow ${workflowId} is already running`,
                    },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                });
                return;
            }

            // Start workflow execution
            const workflowContext = {
                workflowId,
                initiator: context.initiator,
                metadata: {
                    ...context.metadata,
                    userId: req.user?.userId || 'anonymous',
                    requestId: req.context?.requestId || 'unknown',
                },
            };

            // Start the workflow (non-blocking)
            workflowExecutor.startWorkflow(workflowId, workflowContext);

            // Record metrics
            metricsController.incrementMetric('workflow_starts');

            const response: ApiResponse = {
                success: true,
                data: {
                    workflowId,
                    status: 'started',
                    message: 'Workflow execution started successfully',
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.CREATED).json(response);
        } catch (error) {
            metricsController.incrementMetric('workflow_start_errors');

            const response: ApiResponse = {
                success: false,
                error: {
                    code: ApiErrorCode.WORKFLOW_EXECUTION_ERROR,
                    message: 'Failed to start workflow',
                    details: { error: error instanceof Error ? error.message : String(error) },
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
        }
    }

    /**
     * GET /api/v1/workflow/:id/status - Get workflow status
     */
    async getWorkflowStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id: workflowId } = req.params;

            if (!workflowId) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    error: {
                        code: ApiErrorCode.VALIDATION_ERROR,
                        message: 'Workflow ID is required',
                    },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                });
                return;
            }

            const status = workflowExecutor.getWorkflowStatus(workflowId);
            const workflowState = workflowExecutor.getWorkflowState(workflowId);

            if (!status) {
                res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    error: {
                        code: ApiErrorCode.WORKFLOW_NOT_FOUND,
                        message: `Workflow ${workflowId} not found`,
                    },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                });
                return;
            }

            const statusResponse: WorkflowStatusResponse = {
                workflowId,
                status,
                currentStep: workflowState
                    ? workflowState.workflow.steps[workflowState.currentStepIndex]?.id
                    : undefined,
                progress: {
                    completed: workflowState?.currentStepIndex || 0,
                    total: workflowState?.workflow.steps.length || 0,
                    percentage: workflowState
                        ? Math.round(
                              (workflowState.currentStepIndex /
                                  workflowState.workflow.steps.length) *
                                  100
                          )
                        : 0,
                },
                results: workflowState?.stepResults,
            };

            const response: ApiResponse<WorkflowStatusResponse> = {
                success: true,
                data: statusResponse,
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.OK).json(response);
        } catch (error) {
            const response: ApiResponse = {
                success: false,
                error: {
                    code: ApiErrorCode.INTERNAL_ERROR,
                    message: 'Failed to get workflow status',
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
        }
    }

    /**
     * POST /api/v1/workflow/:id/pause - Pause workflow execution
     */
    async pauseWorkflow(req: Request, res: Response): Promise<void> {
        try {
            const { id: workflowId } = req.params;

            if (!workflowId) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    error: {
                        code: ApiErrorCode.VALIDATION_ERROR,
                        message: 'Workflow ID is required',
                    },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                });
                return;
            }

            const currentStatus = workflowExecutor.getWorkflowStatus(workflowId);
            if (!currentStatus) {
                res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    error: {
                        code: ApiErrorCode.WORKFLOW_NOT_FOUND,
                        message: `Workflow ${workflowId} not found`,
                    },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                });
                return;
            }

            if (currentStatus !== WorkflowStatus.RUNNING) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    error: {
                        code: ApiErrorCode.WORKFLOW_EXECUTION_ERROR,
                        message: `Cannot pause workflow in status: ${currentStatus}`,
                    },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                });
                return;
            }

            await workflowExecutor.pauseWorkflow(workflowId);
            metricsController.incrementMetric('workflow_pauses');

            const response: ApiResponse = {
                success: true,
                data: {
                    workflowId,
                    status: 'paused',
                    message: 'Workflow paused successfully',
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.OK).json(response);
        } catch (error) {
            const response: ApiResponse = {
                success: false,
                error: {
                    code: ApiErrorCode.WORKFLOW_EXECUTION_ERROR,
                    message: 'Failed to pause workflow',
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
        }
    }

    /**
     * POST /api/v1/workflow/:id/resume - Resume paused workflow
     */
    async resumeWorkflow(req: Request, res: Response): Promise<void> {
        try {
            const { id: workflowId } = req.params;

            if (!workflowId) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    error: {
                        code: ApiErrorCode.VALIDATION_ERROR,
                        message: 'Workflow ID is required',
                    },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                });
                return;
            }

            const currentStatus = workflowExecutor.getWorkflowStatus(workflowId);
            if (!currentStatus) {
                res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    error: {
                        code: ApiErrorCode.WORKFLOW_NOT_FOUND,
                        message: `Workflow ${workflowId} not found`,
                    },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                });
                return;
            }

            if (currentStatus !== WorkflowStatus.PAUSED) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    error: {
                        code: ApiErrorCode.WORKFLOW_EXECUTION_ERROR,
                        message: `Cannot resume workflow in status: ${currentStatus}`,
                    },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                });
                return;
            }

            await workflowExecutor.resumeWorkflow(workflowId);
            metricsController.incrementMetric('workflow_resumes');

            const response: ApiResponse = {
                success: true,
                data: {
                    workflowId,
                    status: 'resumed',
                    message: 'Workflow resumed successfully',
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.OK).json(response);
        } catch (error) {
            const response: ApiResponse = {
                success: false,
                error: {
                    code: ApiErrorCode.WORKFLOW_EXECUTION_ERROR,
                    message: 'Failed to resume workflow',
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
        }
    }

    /**
     * GET /api/v1/workflow/list - List all active workflows
     */
    async listActiveWorkflows(req: Request, res: Response): Promise<void> {
        try {
            const activeWorkflows = workflowExecutor.listActiveWorkflows();

            const workflowsWithStatus = activeWorkflows.map((workflowId) => {
                const status = workflowExecutor.getWorkflowStatus(workflowId);
                const state = workflowExecutor.getWorkflowState(workflowId);

                return {
                    workflowId,
                    status,
                    progress: state
                        ? {
                              completed: state.currentStepIndex,
                              total: state.workflow.steps.length,
                              percentage: Math.round(
                                  (state.currentStepIndex / state.workflow.steps.length) * 100
                              ),
                          }
                        : null,
                };
            });

            const response: ApiResponse = {
                success: true,
                data: {
                    workflows: workflowsWithStatus,
                    total: workflowsWithStatus.length,
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.OK).json(response);
        } catch (error) {
            const response: ApiResponse = {
                success: false,
                error: {
                    code: ApiErrorCode.INTERNAL_ERROR,
                    message: 'Failed to list workflows',
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
        }
    }
}

// Export singleton instance
export const workflowController = new WorkflowController();
