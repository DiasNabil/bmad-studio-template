// src/api/controllers/auditController.ts
import { Request, Response } from 'express';
import { AuditEntry, ApiResponse, HttpStatus, ApiErrorCode } from '../types';
import '../middleware/express-types';

/**
 * Audit controller for managing audit logs
 */
export class AuditController {
    private auditLogs: AuditEntry[] = [];
    private maxLogs = 10000; // Keep last 10,000 audit entries

    constructor() {
        // Initialize with some sample audit entries
        this.initializeSampleData();
    }

    /**
     * GET /audit - Get audit logs with optional filtering
     */
    async getAuditLogs(req: Request, res: Response): Promise<void> {
        try {
            const {
                action,
                resource,
                user,
                result,
                startDate,
                endDate,
                limit = '100',
                offset = '0',
            } = req.query;

            let filteredLogs = [...this.auditLogs];

            // Apply filters
            if (action && typeof action === 'string') {
                filteredLogs = filteredLogs.filter((log) => log.action.includes(action));
            }

            if (resource && typeof resource === 'string') {
                filteredLogs = filteredLogs.filter((log) => log.resource.includes(resource));
            }

            if (user && typeof user === 'string') {
                filteredLogs = filteredLogs.filter((log) => log.user.includes(user));
            }

            if (
                result &&
                typeof result === 'string' &&
                (result === 'success' || result === 'failure')
            ) {
                filteredLogs = filteredLogs.filter((log) => log.result === result);
            }

            // Date filtering
            if (startDate && typeof startDate === 'string') {
                const start = new Date(startDate);
                if (!isNaN(start.getTime())) {
                    filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp) >= start);
                }
            }

            if (endDate && typeof endDate === 'string') {
                const end = new Date(endDate);
                if (!isNaN(end.getTime())) {
                    filteredLogs = filteredLogs.filter((log) => new Date(log.timestamp) <= end);
                }
            }

            // Sort by timestamp (newest first)
            filteredLogs.sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            // Pagination
            const limitNum = Math.min(parseInt(limit as string, 10) || 100, 1000);
            const offsetNum = parseInt(offset as string, 10) || 0;
            const paginatedLogs = filteredLogs.slice(offsetNum, offsetNum + limitNum);

            const response: ApiResponse = {
                success: true,
                data: {
                    logs: paginatedLogs,
                    pagination: {
                        total: filteredLogs.length,
                        limit: limitNum,
                        offset: offsetNum,
                        hasMore: offsetNum + limitNum < filteredLogs.length,
                    },
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
                    message: 'Failed to retrieve audit logs',
                    details: { error: error instanceof Error ? error.message : String(error) },
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
        }
    }

    /**
     * GET /audit/summary - Get audit summary statistics
     */
    async getAuditSummary(req: Request, res: Response): Promise<void> {
        try {
            const now = new Date();
            const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            const last24hLogs = this.auditLogs.filter((log) => new Date(log.timestamp) >= last24h);
            const last7dLogs = this.auditLogs.filter((log) => new Date(log.timestamp) >= last7d);

            // Action statistics
            const actionStats = this.auditLogs.reduce(
                (acc, log) => {
                    acc[log.action] = (acc[log.action] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>
            );

            // User statistics
            const userStats = this.auditLogs.reduce(
                (acc, log) => {
                    acc[log.user] = (acc[log.user] || 0) + 1;
                    return acc;
                },
                {} as Record<string, number>
            );

            // Result statistics
            const successCount = this.auditLogs.filter((log) => log.result === 'success').length;
            const failureCount = this.auditLogs.filter((log) => log.result === 'failure').length;

            const summary = {
                totalEntries: this.auditLogs.length,
                last24Hours: last24hLogs.length,
                last7Days: last7dLogs.length,
                statistics: {
                    actions: actionStats,
                    users: Object.fromEntries(
                        Object.entries(userStats)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 10) // Top 10 users
                    ),
                    results: {
                        success: successCount,
                        failure: failureCount,
                        successRate:
                            this.auditLogs.length > 0
                                ? Math.round((successCount / this.auditLogs.length) * 100)
                                : 0,
                    },
                },
                dateRange: {
                    oldest:
                        this.auditLogs.length > 0
                            ? this.auditLogs[this.auditLogs.length - 1].timestamp
                            : null,
                    newest: this.auditLogs.length > 0 ? this.auditLogs[0].timestamp : null,
                },
            };

            const response: ApiResponse = {
                success: true,
                data: summary,
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.OK).json(response);
        } catch (error) {
            const response: ApiResponse = {
                success: false,
                error: {
                    code: ApiErrorCode.INTERNAL_ERROR,
                    message: 'Failed to generate audit summary',
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
        }
    }

    /**
     * POST /audit - Add new audit entry (internal use)
     */
    async addAuditEntry(req: Request, res: Response): Promise<void> {
        try {
            const { action, resource, details } = req.body;

            if (!action || !resource) {
                res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    error: {
                        code: ApiErrorCode.VALIDATION_ERROR,
                        message: 'Action and resource are required',
                    },
                    timestamp: new Date().toISOString(),
                    version: '1.0.0',
                });
                return;
            }

            const auditEntry: AuditEntry = {
                id: this.generateId(),
                timestamp: new Date().toISOString(),
                action,
                resource,
                user: req.user?.userId || 'system',
                details: details || {},
                result: 'success',
            };

            this.logAuditEntry(auditEntry);

            const response: ApiResponse = {
                success: true,
                data: { auditId: auditEntry.id },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.CREATED).json(response);
        } catch (error) {
            const response: ApiResponse = {
                success: false,
                error: {
                    code: ApiErrorCode.INTERNAL_ERROR,
                    message: 'Failed to create audit entry',
                },
                timestamp: new Date().toISOString(),
                version: '1.0.0',
            };

            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(response);
        }
    }

    /**
     * Public method to log audit entries from other parts of the system
     */
    logAuditEntry(entry: Omit<AuditEntry, 'id'> | AuditEntry): void {
        const auditEntry: AuditEntry = {
            id: 'id' in entry ? entry.id : this.generateId(),
            ...entry,
        };

        this.auditLogs.unshift(auditEntry);

        // Keep only the last maxLogs entries
        if (this.auditLogs.length > this.maxLogs) {
            this.auditLogs = this.auditLogs.slice(0, this.maxLogs);
        }
    }

    /**
     * Log workflow-related audit entry
     */
    logWorkflowAudit(
        workflowId: string,
        action: string,
        user: string,
        result: 'success' | 'failure',
        details?: any
    ): void {
        this.logAuditEntry({
            timestamp: new Date().toISOString(),
            action: `workflow_${action}`,
            resource: `workflow:${workflowId}`,
            user,
            details: details || {},
            result,
        });
    }

    /**
     * Log API access audit entry
     */
    logApiAudit(req: Request, result: 'success' | 'failure', details?: any): void {
        this.logAuditEntry({
            timestamp: new Date().toISOString(),
            action: `api_${req.method.toLowerCase()}`,
            resource: `endpoint:${req.path}`,
            user: req.user?.userId || 'anonymous',
            details: {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                ...details,
            },
            result,
        });
    }

    /**
     * Initialize with sample audit data
     */
    private initializeSampleData(): void {
        const sampleEntries: Omit<AuditEntry, 'id'>[] = [
            {
                timestamp: new Date().toISOString(),
                action: 'system_startup',
                resource: 'bmad_api_server',
                user: 'system',
                details: { version: '1.0.0', port: 3000 },
                result: 'success',
            },
            {
                timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                action: 'workflow_start',
                resource: 'workflow:sample-workflow',
                user: 'admin',
                details: { workflowType: 'parallel-brownfield' },
                result: 'success',
            },
            {
                timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
                action: 'api_authentication',
                resource: 'auth_endpoint',
                user: 'user123',
                details: { method: 'jwt', ip: '127.0.0.1' },
                result: 'success',
            },
        ];

        sampleEntries.forEach((entry) => this.logAuditEntry(entry));
    }

    /**
     * Generate unique ID for audit entries
     */
    private generateId(): string {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export singleton instance
export const auditController = new AuditController();
