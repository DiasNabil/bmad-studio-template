// src/api/server.ts
import { Server } from 'http';
import * as cors from 'cors';
import * as express from 'express';
import { auditController } from './controllers/auditController';
import { healthController } from './controllers/healthController';
import { metricsController } from './controllers/metricsController';
import { workflowController } from './controllers/workflowController';
import { authenticateJWT, optionalAuth, requireRole, requirePermission } from './middleware/auth';
import {
    apiRateLimiter,
    strictRateLimiter,
    workflowRateLimiter,
    metricsRateLimiter,
    globalRateLimiter,
} from './middleware/rateLimiter';
import { ApiResponse, HttpStatus, ApiErrorCode, API_PREFIX } from './types';
import './middleware/express-types';

/**
 * BMAD API Server
 * Main Express server for the BMAD Studio Template
 */
export class BMadApiServer {
    private app: express.Application;
    private server?: Server;
    private port: number;

    constructor(port: number = 3000) {
        this.port = port;
        this.app = express.default();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    /**
     * Setup Express middleware
     */
    private setupMiddleware(): void {
        // Trust proxy for accurate IP addresses
        this.app.set('trust proxy', true);

        // CORS configuration
        this.app.use(
            cors.default({
                origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization'],
                credentials: true,
            })
        );

        // Body parsing middleware
        this.app.use(express.default.json({ limit: '10mb' }));
        this.app.use(express.default.urlencoded({ extended: true, limit: '10mb' }));

        // Global rate limiting
        this.app.use(globalRateLimiter);

        // Request context middleware
        this.app.use((req, res, next) => {
            req.context = {
                requestId: this.generateRequestId(),
                startTime: Date.now(),
                ip: req.ip || req.socket.remoteAddress || 'unknown',
                userAgent: req.get('User-Agent') || 'unknown',
            };
            next();
        });

        // Request logging middleware
        this.app.use((req, res, next) => {
            // eslint-disable-next-line no-console
            console.log(
                `[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.context?.ip}`
            );
            next();
        });
    }

    /**
     * Setup API routes
     */
    private setupRoutes(): void {
        // Health endpoints (no authentication required)
        this.app.get('/health', healthController.getHealth.bind(healthController));
        this.app.get('/health/ready', healthController.getReadiness.bind(healthController));
        this.app.get('/health/live', healthController.getLiveness.bind(healthController));

        // Metrics endpoints (rate limited, optional auth)
        this.app.get(
            '/metrics',
            metricsRateLimiter,
            optionalAuth,
            metricsController.getMetrics.bind(metricsController)
        );

        this.app.get(
            '/metrics/json',
            metricsRateLimiter,
            authenticateJWT,
            metricsController.getMetricsJson.bind(metricsController)
        );

        // Audit endpoints (authentication required)
        this.app.get(
            '/audit',
            strictRateLimiter,
            authenticateJWT,
            requireRole(['admin', 'auditor']),
            auditController.getAuditLogs.bind(auditController)
        );

        this.app.get(
            '/audit/summary',
            strictRateLimiter,
            authenticateJWT,
            requireRole(['admin', 'auditor']),
            auditController.getAuditSummary.bind(auditController)
        );

        // API v1 routes
        const v1Router = express.default.Router();

        // Workflow management endpoints
        v1Router.post(
            '/workflow/start',
            workflowRateLimiter,
            authenticateJWT,
            requirePermission(['workflow:start']),
            workflowController.startWorkflow.bind(workflowController)
        );

        v1Router.get(
            '/workflow/:id/status',
            apiRateLimiter,
            authenticateJWT,
            requirePermission(['workflow:read']),
            workflowController.getWorkflowStatus.bind(workflowController)
        );

        v1Router.post(
            '/workflow/:id/pause',
            workflowRateLimiter,
            authenticateJWT,
            requirePermission(['workflow:control']),
            workflowController.pauseWorkflow.bind(workflowController)
        );

        v1Router.post(
            '/workflow/:id/resume',
            workflowRateLimiter,
            authenticateJWT,
            requirePermission(['workflow:control']),
            workflowController.resumeWorkflow.bind(workflowController)
        );

        v1Router.get(
            '/workflow/list',
            apiRateLimiter,
            authenticateJWT,
            requirePermission(['workflow:read']),
            workflowController.listActiveWorkflows.bind(workflowController)
        );

        // Mount v1 router
        this.app.use(API_PREFIX, v1Router);

        // API documentation endpoint
        this.app.get('/api', this.getApiDocumentation.bind(this));

        // 404 handler for unknown routes
        this.app.use('*', (req, res) => {
            const response: ApiResponse = {
                success: false,
                error: {
                    code: ApiErrorCode.RESOURCE_NOT_FOUND,
                    message: `Endpoint ${req.method} ${req.originalUrl} not found`,
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.NOT_FOUND).json(response);
        });
    }

    /**
     * Setup error handling middleware
     */
    private setupErrorHandling(): void {
        // Global error handler
        this.app.use(
            (
                error: Error,
                req: express.Request,
                res: express.Response,
                _next: express.NextFunction
            ) => {
                // eslint-disable-next-line no-console
                console.error(`[ERROR] ${error.message}`, error.stack);

                // Log audit entry for the error
                auditController.logApiAudit(req, 'failure', {
                    error: error.message,
                    stack: error.stack,
                });

                const response: ApiResponse = {
                    success: false,
                    error: {
                        code: ApiErrorCode.INTERNAL_ERROR,
                        message: 'Internal server error',
                        details:
                            process.env.NODE_ENV === 'development'
                                ? {
                                      message: error.message,
                                      stack: error.stack,
                                  }
                                : undefined,
                    },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                };

                res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
            }
        );

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            // eslint-disable-next-line no-console
            console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            auditController.logAuditEntry({
                timestamp: new Date().toISOString(),
                action: 'unhandled_rejection',
                resource: 'nodejs_process',
                user: 'system',
                details: { reason: String(reason) },
                result: 'failure',
            });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            // eslint-disable-next-line no-console
            console.error('Uncaught Exception:', error);
            auditController.logAuditEntry({
                timestamp: new Date().toISOString(),
                action: 'uncaught_exception',
                resource: 'nodejs_process',
                user: 'system',
                details: { error: error.message, stack: error.stack },
                result: 'failure',
            });

            // Graceful shutdown
            this.shutdown();
        });
    }

    /**
     * API documentation endpoint
     */
    private getApiDocumentation(req: express.Request, res: express.Response): void {
        const documentation = {
            name: 'BMAD Studio API',
            version: '1.0.0',
            description: 'RESTful API for BMAD Studio Template - Workflow execution and management',
            endpoints: {
                health: {
                    'GET /health': 'System health check',
                    'GET /health/ready': 'Readiness probe',
                    'GET /health/live': 'Liveness probe',
                },
                metrics: {
                    'GET /metrics': 'Prometheus format metrics (optional auth)',
                    'GET /metrics/json': 'JSON format metrics (auth required)',
                },
                audit: {
                    'GET /audit': 'Get audit logs with filtering (admin/auditor only)',
                    'GET /audit/summary': 'Get audit summary statistics (admin/auditor only)',
                },
                workflows: {
                    'POST /api/v1/workflow/start': 'Start a new workflow execution',
                    'GET /api/v1/workflow/:id/status': 'Get workflow status and progress',
                    'POST /api/v1/workflow/:id/pause': 'Pause running workflow',
                    'POST /api/v1/workflow/:id/resume': 'Resume paused workflow',
                    'GET /api/v1/workflow/list': 'List all active workflows',
                },
            },
            authentication: {
                type: 'JWT Bearer Token',
                header: 'Authorization: Bearer <token>',
                permissions: [
                    'workflow:start - Start workflow executions',
                    'workflow:read - Read workflow status',
                    'workflow:control - Pause/resume workflows',
                ],
                roles: [
                    'admin - Full system access',
                    'auditor - Audit log access',
                    'operator - Workflow operations',
                ],
            },
            rateLimit: {
                global: '500 requests per 15 minutes',
                api: '100 requests per 15 minutes',
                workflow: '50 requests per 15 minutes',
                metrics: '200 requests per 15 minutes',
                strict: '10 requests per 15 minutes',
            },
        };

        res.json(documentation);
    }

    /**
     * Start the server
     */
    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, () => {
                    // eslint-disable-next-line no-console
                    console.log(`🚀 BMAD API Server running on port ${this.port}`);
                    // eslint-disable-next-line no-console
                    console.log(`📊 Metrics: http://localhost:${this.port}/metrics`);
                    // eslint-disable-next-line no-console
                    console.log(`🔍 Health: http://localhost:${this.port}/health`);
                    // eslint-disable-next-line no-console
                    console.log(`📚 API Docs: http://localhost:${this.port}/api`);

                    // Log server startup
                    auditController.logAuditEntry({
                        timestamp: new Date().toISOString(),
                        action: 'server_start',
                        resource: 'bmad_api_server',
                        user: 'system',
                        details: { port: this.port, version: '1.0.0' },
                        result: 'success',
                    });

                    resolve();
                });

                this.server.on('error', reject);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Shutdown the server gracefully
     */
    async shutdown(): Promise<void> {
        if (this.server) {
            // eslint-disable-next-line no-console
            console.log('🛑 Shutting down BMAD API Server...');

            auditController.logAuditEntry({
                timestamp: new Date().toISOString(),
                action: 'server_shutdown',
                resource: 'bmad_api_server',
                user: 'system',
                details: { graceful: true },
                result: 'success',
            });

            return new Promise((resolve) => {
                this.server!.close(() => {
                    // eslint-disable-next-line no-console
                    console.log('✅ BMAD API Server shut down successfully');
                    resolve();
                });
            });
        }
    }

    /**
     * Get Express app instance
     */
    getApp(): express.Application {
        return this.app;
    }

    /**
     * Generate unique request ID
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Create and export server instance
export const bmadServer = new BMadApiServer(parseInt(process.env.PORT || '3000', 10));

// Start server if this file is run directly
if (require.main === module) {
    bmadServer.start().catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to start BMAD API Server:', error);
        process.exit(1);
    });
}
