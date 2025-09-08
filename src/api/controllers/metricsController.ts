// src/api/controllers/metricsController.ts
import { Request, Response } from 'express';
import { parallelCoordinator } from '../../workflow/coordinator';
import { workflowExecutor } from '../../workflow/WorkflowExecutor';
import { ApiResponse, HttpStatus } from '../types';
import '../middleware/express-types';

/**
 * Metrics controller for Prometheus format metrics
 */
export class MetricsController {
    private metricsHistory: Map<string, number[]> = new Map();
    private startTime: number = Date.now();

    /**
     * GET /metrics - Prometheus format metrics
     */
    async getMetrics(req: Request, res: Response): Promise<void> {
        try {
            const metricsData = this.generatePrometheusMetrics();

            // Set Prometheus content type
            res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
            res.status(HttpStatus.OK).send(metricsData);
        } catch (error) {
            const response: ApiResponse = {
                success: false,
                error: {
                    code: 'METRICS_ERROR',
                    message: 'Failed to generate metrics',
                    details: { error: error instanceof Error ? error.message : String(error) },
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
        }
    }

    /**
     * GET /metrics/json - JSON format metrics for internal use
     */
    async getMetricsJson(req: Request, res: Response): Promise<void> {
        try {
            const metrics = this.collectMetrics();

            const response: ApiResponse = {
                success: true,
                data: metrics,
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.OK).json(response);
        } catch (error) {
            const response: ApiResponse = {
                success: false,
                error: {
                    code: 'METRICS_JSON_ERROR',
                    message: 'Failed to generate JSON metrics',
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
        }
    }

    /**
     * Generate Prometheus format metrics
     */
    private generatePrometheusMetrics(): string {
        const metrics = this.collectMetrics();
        const timestamp = Date.now();

        let output = '';

        // System uptime
        output += '# HELP bmad_system_uptime_seconds System uptime in seconds\n';
        output += '# TYPE bmad_system_uptime_seconds counter\n';
        output += `bmad_system_uptime_seconds ${Math.floor((timestamp - this.startTime) / 1000)}\n\n`;

        // Active workflows
        output += '# HELP bmad_workflows_active Number of active workflows\n';
        output += '# TYPE bmad_workflows_active gauge\n';
        output += `bmad_workflows_active ${metrics.workflows.active}\n\n`;

        // Workflow executions total
        output += '# HELP bmad_workflows_executions_total Total number of workflow executions\n';
        output += '# TYPE bmad_workflows_executions_total counter\n';
        output += `bmad_workflows_executions_total{status="success"} ${metrics.workflows.totalExecutions.success}\n`;
        output += `bmad_workflows_executions_total{status="failed"} ${metrics.workflows.totalExecutions.failed}\n\n`;

        // Workflow execution duration
        output +=
            '# HELP bmad_workflow_execution_duration_seconds Workflow execution duration in seconds\n';
        output += '# TYPE bmad_workflow_execution_duration_seconds histogram\n';
        output += `bmad_workflow_execution_duration_seconds_sum ${metrics.workflows.executionTime.total}\n`;
        output += `bmad_workflow_execution_duration_seconds_count ${metrics.workflows.executionTime.count}\n\n`;

        // API requests total
        output += '# HELP bmad_api_requests_total Total number of API requests\n';
        output += '# TYPE bmad_api_requests_total counter\n';
        output += `bmad_api_requests_total{method="GET",status="200"} ${metrics.api.requests.get.success}\n`;
        output += `bmad_api_requests_total{method="GET",status="error"} ${metrics.api.requests.get.error}\n`;
        output += `bmad_api_requests_total{method="POST",status="200"} ${metrics.api.requests.post.success}\n`;
        output += `bmad_api_requests_total{method="POST",status="error"} ${metrics.api.requests.post.error}\n\n`;

        // API request duration
        output += '# HELP bmad_api_request_duration_seconds API request duration in seconds\n';
        output += '# TYPE bmad_api_request_duration_seconds histogram\n';
        output += `bmad_api_request_duration_seconds_sum ${metrics.api.responseTime.total}\n`;
        output += `bmad_api_request_duration_seconds_count ${metrics.api.responseTime.count}\n\n`;

        // Parallel coordination metrics
        output +=
            '# HELP bmad_parallel_coordinations_total Total number of parallel coordinations\n';
        output += '# TYPE bmad_parallel_coordinations_total counter\n';
        output += `bmad_parallel_coordinations_total{status="success"} ${metrics.coordination.total.success}\n`;
        output += `bmad_parallel_coordinations_total{status="failed"} ${metrics.coordination.total.failed}\n\n`;

        // Active domains
        output += '# HELP bmad_active_domains Number of active domains in coordination\n';
        output += '# TYPE bmad_active_domains gauge\n';
        output += `bmad_active_domains ${metrics.coordination.activeDomains}\n\n`;

        // Memory usage
        const memUsage = process.memoryUsage();
        output += '# HELP bmad_memory_usage_bytes Memory usage in bytes\n';
        output += '# TYPE bmad_memory_usage_bytes gauge\n';
        output += `bmad_memory_usage_bytes{type="rss"} ${memUsage.rss}\n`;
        output += `bmad_memory_usage_bytes{type="heapUsed"} ${memUsage.heapUsed}\n`;
        output += `bmad_memory_usage_bytes{type="heapTotal"} ${memUsage.heapTotal}\n`;
        output += `bmad_memory_usage_bytes{type="external"} ${memUsage.external}\n\n`;

        // CPU usage (placeholder)
        output += '# HELP bmad_cpu_usage_percent CPU usage percentage\n';
        output += '# TYPE bmad_cpu_usage_percent gauge\n';
        output += `bmad_cpu_usage_percent ${metrics.system.cpuUsage}\n\n`;

        return output;
    }

    /**
     * Collect current metrics
     */
    private collectMetrics() {
        const activeWorkflows = workflowExecutor.listActiveWorkflows();
        const activeDomains = parallelCoordinator.getActiveDomains();

        return {
            timestamp: new Date().toISOString(),
            system: {
                uptime: Math.floor((Date.now() - this.startTime) / 1000),
                cpuUsage: this.getCpuUsage(),
                memoryUsage: process.memoryUsage(),
            },
            workflows: {
                active: activeWorkflows.length,
                totalExecutions: {
                    success: this.getMetricValue('workflow_executions_success'),
                    failed: this.getMetricValue('workflow_executions_failed'),
                },
                executionTime: {
                    total: this.getMetricValue('workflow_execution_time_total'),
                    count: this.getMetricValue('workflow_execution_count'),
                    average: this.getAverageExecutionTime(),
                },
            },
            api: {
                requests: {
                    get: {
                        success: this.getMetricValue('api_get_success'),
                        error: this.getMetricValue('api_get_error'),
                    },
                    post: {
                        success: this.getMetricValue('api_post_success'),
                        error: this.getMetricValue('api_post_error'),
                    },
                },
                responseTime: {
                    total: this.getMetricValue('api_response_time_total'),
                    count: this.getMetricValue('api_response_count'),
                    average: this.getAverageResponseTime(),
                },
            },
            coordination: {
                activeDomains: activeDomains.size,
                total: {
                    success: this.getMetricValue('coordination_success'),
                    failed: this.getMetricValue('coordination_failed'),
                },
            },
        };
    }

    /**
     * Increment a metric counter
     */
    incrementMetric(metricName: string, value: number = 1): void {
        if (!this.metricsHistory.has(metricName)) {
            this.metricsHistory.set(metricName, []);
        }

        const current = this.getMetricValue(metricName);
        this.metricsHistory.set(metricName, [current + value]);
    }

    /**
     * Record a metric value
     */
    recordMetric(metricName: string, value: number): void {
        if (!this.metricsHistory.has(metricName)) {
            this.metricsHistory.set(metricName, []);
        }

        const history = this.metricsHistory.get(metricName)!;
        history.push(value);

        // Keep only last 1000 values
        if (history.length > 1000) {
            history.shift();
        }
    }

    /**
     * Get current value of a metric
     */
    private getMetricValue(metricName: string): number {
        const history = this.metricsHistory.get(metricName);
        return history && history.length > 0 ? history[history.length - 1] : 0;
    }

    /**
     * Get average workflow execution time
     */
    private getAverageExecutionTime(): number {
        const total = this.getMetricValue('workflow_execution_time_total');
        const count = this.getMetricValue('workflow_execution_count');
        return count > 0 ? total / count : 0;
    }

    /**
     * Get average API response time
     */
    private getAverageResponseTime(): number {
        const total = this.getMetricValue('api_response_time_total');
        const count = this.getMetricValue('api_response_count');
        return count > 0 ? total / count : 0;
    }

    /**
     * Get CPU usage (placeholder - implement with actual CPU monitoring)
     */
    private getCpuUsage(): number {
        // This should use actual CPU monitoring library
        return Math.random() * 100; // Placeholder
    }
}

// Export singleton instance
export const metricsController = new MetricsController();
