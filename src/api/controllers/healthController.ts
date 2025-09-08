// src/api/controllers/healthController.ts
import { Request, Response } from 'express';
import { workflowExecutor } from '../../workflow/WorkflowExecutor';
import { HealthResponse, ApiResponse, HttpStatus } from '../types';
import './express-types';

/**
 * Health check controller
 */
export class HealthController {
    private startTime: number;

    constructor() {
        this.startTime = Date.now();
    }

    /**
     * GET /health - System health check
     */
    async getHealth(req: Request, res: Response): Promise<void> {
        try {
            const uptime = Date.now() - this.startTime;
            const activeWorkflows = workflowExecutor.listActiveWorkflows().length;

            // Check various service statuses
            const services = await this.checkServices();

            // Determine overall health status
            const overallStatus = this.determineHealthStatus(services);

            const healthData: HealthResponse = {
                status: overallStatus,
                uptime,
                version: process.env.npm_package_version || '1.0.0',
                services,
                metrics: {
                    activeWorkflows,
                    totalRequests: this.getTotalRequests(),
                    averageResponseTime: this.getAverageResponseTime(),
                },
            };

            const response: ApiResponse<HealthResponse> = {
                success: true,
                data: healthData,
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            // Set appropriate HTTP status based on health
            const httpStatus =
                overallStatus === 'healthy'
                    ? HttpStatus.OK
                    : overallStatus === 'degraded'
                      ? HttpStatus.OK
                      : HttpStatus.SERVICE_UNAVAILABLE;

            res.status(httpStatus).json(response);
        } catch (error) {
            const response: ApiResponse = {
                success: false,
                error: {
                    code: 'HEALTH_CHECK_ERROR',
                    message: 'Failed to perform health check',
                    details: { error: error instanceof Error ? error.message : String(error) },
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
        }
    }

    /**
     * GET /health/ready - Readiness probe
     */
    async getReadiness(req: Request, res: Response): Promise<void> {
        try {
            // Check if system is ready to accept traffic
            const services = await this.checkServices();
            const criticalServicesUp = services.workflow === 'up';

            if (criticalServicesUp) {
                res.status(HttpStatus.OK).json({
                    success: true,
                    data: { ready: true },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                });
            } else {
                res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
                    success: false,
                    error: {
                        code: 'SERVICE_NOT_READY',
                        message: 'System is not ready to accept traffic',
                    },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                });
            }
        } catch (error) {
            res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
                success: false,
                error: {
                    code: 'READINESS_CHECK_ERROR',
                    message: 'Failed to check readiness',
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            });
        }
    }

    /**
     * GET /health/live - Liveness probe
     */
    async getLiveness(req: Request, res: Response): Promise<void> {
        // Simple liveness check - if we can respond, we're alive
        res.status(HttpStatus.OK).json({
            success: true,
            data: { alive: true, timestamp: new Date().toISOString() },
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        });
    }

    /**
     * Check individual service statuses
     */
    private async checkServices(): Promise<HealthResponse['services']> {
        const services: HealthResponse['services'] = {
            workflow: 'down',
            database: 'down',
            redis: 'down',
        };

        try {
            // Check workflow service
            const activeWorkflows = workflowExecutor.listActiveWorkflows();
            services.workflow = Array.isArray(activeWorkflows) ? 'up' : 'down';
        } catch (error) {
            services.workflow = 'down';
        }

        try {
            // Check database connection (placeholder - implement based on your DB)
            services.database = (await this.checkDatabase()) ? 'up' : 'down';
        } catch (error) {
            services.database = 'down';
        }

        try {
            // Check Redis connection (placeholder - implement based on your cache)
            services.redis = (await this.checkRedis()) ? 'up' : 'down';
        } catch (error) {
            services.redis = 'down';
        }

        return services;
    }

    /**
     * Determine overall health status based on service statuses
     */
    private determineHealthStatus(services: HealthResponse['services']): HealthResponse['status'] {
        const serviceStatuses = Object.values(services);
        const upCount = serviceStatuses.filter((status) => status === 'up').length;
        const totalServices = serviceStatuses.length;

        if (upCount === totalServices) {
            return 'healthy';
        } else if (upCount >= totalServices / 2) {
            return 'degraded';
        } else {
            return 'unhealthy';
        }
    }

    /**
     * Placeholder for database health check
     */
    private async checkDatabase(): Promise<boolean> {
        // Implement actual database connection check
        // For now, assume database is available
        return Promise.resolve(true);
    }

    /**
     * Placeholder for Redis health check
     */
    private async checkRedis(): Promise<boolean> {
        // Implement actual Redis connection check
        // For now, assume Redis is available
        return Promise.resolve(true);
    }

    /**
     * Get total request count (placeholder - implement with actual metrics)
     */
    private getTotalRequests(): number {
        // This should be tracked by middleware or metrics system
        return 0;
    }

    /**
     * Get average response time (placeholder - implement with actual metrics)
     */
    private getAverageResponseTime(): number {
        // This should be calculated from request timing data
        return 0;
    }
}

// Export singleton instance
export const healthController = new HealthController();
