// MCP Audit Logger - Intégration avec l'architecture BMAD existante
import * as fs from 'fs/promises';
import * as path from 'path';

import { BMadError, ErrorSeverity } from './ErrorHandler';
import { Logger } from './Logger';

export interface MCPAuditEvent {
    timestamp: string;
    eventId: string;
    agent: string;
    operation: string;
    resource?: string;
    status: 'success' | 'blocked' | 'error' | 'rate_limited';
    severity: ErrorSeverity;
    metadata: {
        sourceIP?: string;
        userAgent?: string;
        sessionId?: string;
        requestDuration?: number;
        resourcePath?: string;
        command?: string;
        args?: string[];
        violationType?: string;
        blockingRule?: unknown;
        attemptedValue?: unknown;
        allowedValues?: unknown;
        rateLimitInfo?: {
            current: number;
            limit: number;
            windowStart: string;
        };
        errorDetails?: {
            code: string;
            message: string;
            stack?: string;
        };
    };
    context?: Record<string, unknown>;
}

export interface AuditLogConfig {
    logPath: string;
    maxFileSize: number; // bytes
    rotationCount: number;
    retentionDays: number;
    sensitiveDataMasking: boolean;
    vaultIntegration: boolean;
    prometheusMetrics: boolean;
}

export class MCPAuditLogger {
    private static instance: MCPAuditLogger;
    private logger: Logger;
    private config: AuditLogConfig;
    private currentLogFile: string;
    private rotationInProgress = false;

    private constructor(config: AuditLogConfig) {
        this.logger = Logger.getInstance();
        this.config = config;
        this.currentLogFile = path.join(config.logPath, 'audit.jsonl');
        this.ensureLogDirectory();
    }

    public static getInstance(config?: AuditLogConfig): MCPAuditLogger {
        if (!MCPAuditLogger.instance) {
            if (!config) {
                throw new BMadError('MCPAuditLogger requires initial configuration', {
                    code: 'MCP_AUDIT_001',
                    severity: ErrorSeverity.CRITICAL,
                });
            }
            MCPAuditLogger.instance = new MCPAuditLogger(config);
        }
        return MCPAuditLogger.instance;
    }

    /**
     * Enregistre un événement d'audit MCP
     */
    public async logEvent(event: Partial<MCPAuditEvent>): Promise<void> {
        try {
            const fullEvent: MCPAuditEvent = {
                timestamp: new Date().toISOString(),
                eventId: this.generateEventId(),
                agent: event.agent || 'unknown',
                operation: event.operation || 'unknown',
                resource: event.resource,
                status: event.status || 'success',
                severity: event.severity || ErrorSeverity.LOW,
                metadata: {
                    ...event.metadata,
                    sessionId: event.metadata?.sessionId || this.generateSessionId(),
                },
                context: event.context,
            };

            // Masquage des données sensibles si activé
            if (this.config.sensitiveDataMasking) {
                this.maskSensitiveData(fullEvent);
            }

            // Écriture dans le fichier d'audit
            await this.writeAuditEvent(fullEvent);

            // Intégration Vault si activée
            if (this.config.vaultIntegration) {
                await this.sendToVaultAudit(fullEvent);
            }

            // Métriques Prometheus si activées
            if (this.config.prometheusMetrics) {
                this.updatePrometheusMetrics(fullEvent);
            }

            // Logging interne pour débogage
            this.logger.warn(`MCP Audit Event: ${fullEvent.agent}/${fullEvent.operation}`, {
                eventId: fullEvent.eventId,
                status: fullEvent.status,
                severity: fullEvent.severity,
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const auditError = new BMadError('Failed to log MCP audit event', {
                code: 'MCP_AUDIT_002',
                severity: ErrorSeverity.HIGH,
                context: { originalEvent: event, error: errorMessage },
            });

            this.logger.error(auditError.message, auditError.toJSON());
            throw auditError;
        }
    }

    /**
     * Log spécifique pour les violations de whitelist
     */
    public async logWhitelistViolation(
        agent: string,
        operation: string,
        resource: string,
        violationType: 'permission' | 'path' | 'domain' | 'command' | 'rate_limit',
        details: Record<string, unknown> = {}
    ): Promise<void> {
        await this.logEvent({
            agent,
            operation,
            resource,
            status: violationType === 'rate_limit' ? 'rate_limited' : 'blocked',
            severity: this.getSeverityForViolation(violationType),
            metadata: {
                violationType,
                blockingRule: details.rule,
                attemptedValue: details.attempted,
                allowedValues: details.allowed,
                ...details,
            },
        });
    }

    /**
     * Log spécifique pour les opérations réussies
     */
    public async logSuccessfulOperation(
        agent: string,
        operation: string,
        resource: string,
        duration: number,
        metadata: Record<string, unknown> = {}
    ): Promise<void> {
        await this.logEvent({
            agent,
            operation,
            resource,
            status: 'success',
            severity: ErrorSeverity.LOW,
            metadata: {
                requestDuration: duration,
                ...metadata,
            },
        });
    }

    /**
     * Log spécifique pour les erreurs MCP
     */
    public async logMCPError(
        agent: string,
        operation: string,
        error: BMadError,
        resource?: string
    ): Promise<void> {
        await this.logEvent({
            agent,
            operation,
            resource,
            status: 'error',
            severity: error.severity,
            metadata: {
                errorDetails: {
                    code: error.code,
                    message: error.message,
                    stack: error.stack,
                },
            },
            context: error.context,
        });
    }

    /**
     * Rotation des logs basée sur la taille
     */
    private async rotateLogsIfNeeded(): Promise<void> {
        if (this.rotationInProgress) return;

        try {
            const stats = await fs.stat(this.currentLogFile);
            if (stats.size >= this.config.maxFileSize) {
                this.rotationInProgress = true;
                await this.performLogRotation();
            }
        } catch (error: unknown) {
            const nodeError = error as { code?: string };
            if (nodeError.code !== 'ENOENT') {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error('Error checking log file size', { error: errorMessage });
            }
        } finally {
            this.rotationInProgress = false;
        }
    }

    private async performLogRotation(): Promise<void> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivePath = path.join(this.config.logPath, `audit-${timestamp}.jsonl`);

        try {
            await fs.rename(this.currentLogFile, archivePath);
            this.logger.warn('MCP audit log rotated', { archivePath });

            // Nettoyage des anciens logs
            await this.cleanupOldLogs();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new BMadError('Failed to rotate MCP audit logs', {
                code: 'MCP_AUDIT_003',
                severity: ErrorSeverity.HIGH,
                context: { error: errorMessage },
            });
        }
    }

    private async cleanupOldLogs(): Promise<void> {
        try {
            const files = await fs.readdir(this.config.logPath);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

            for (const file of files) {
                if (file.startsWith('audit-') && file.endsWith('.jsonl')) {
                    const filePath = path.join(this.config.logPath, file);
                    const stats = await fs.stat(filePath);

                    if (stats.mtime < cutoffDate) {
                        await fs.unlink(filePath);
                        this.logger.warn('Deleted expired MCP audit log', { file });
                    }
                }
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Error cleaning up old audit logs', { error: errorMessage });
        }
    }

    private async writeAuditEvent(event: MCPAuditEvent): Promise<void> {
        await this.rotateLogsIfNeeded();

        const logLine = JSON.stringify(event) + '\n';
        await fs.appendFile(this.currentLogFile, logLine, 'utf8');
    }

    private async sendToVaultAudit(event: MCPAuditEvent): Promise<void> {
        // Intégration avec Vault audit - à implémenter selon la configuration Vault
        // Cette méthode pourrait envoyer les événements critiques vers Vault
        if (event.severity === ErrorSeverity.HIGH || event.severity === ErrorSeverity.CRITICAL) {
            this.logger.warn('Critical MCP event for Vault audit', {
                eventId: event.eventId,
                agent: event.agent,
                operation: event.operation,
            });
        }
    }

    private updatePrometheusMetrics(event: MCPAuditEvent): void {
        // Intégration avec métriques Prometheus existantes
        // Cette méthode incrémenterait les compteurs et histogrammes appropriés

        // Exemples de métriques à implémenter :
        // - mcp_requests_total{agent, operation, status}
        // - mcp_blocked_requests_total{agent, violation_type}
        // - mcp_operation_duration_seconds{agent, operation}

        this.logger.warn('Prometheus metrics updated', {
            metric: `mcp_requests_total`,
            labels: {
                agent: event.agent,
                operation: event.operation,
                status: event.status,
            },
        });
    }

    private maskSensitiveData(event: MCPAuditEvent): void {
        const sensitiveFields = ['password', 'token', 'key', 'secret', 'credential'];

        // Masquage dans les métadonnées
        if (event.metadata.args) {
            event.metadata.args = event.metadata.args.map((arg) => {
                if (typeof arg === 'string') {
                    for (const field of sensitiveFields) {
                        if (arg.toLowerCase().includes(field)) {
                            return '[MASKED]';
                        }
                    }
                }
                return arg;
            });
        }

        // Masquage dans le contexte
        if (event.context) {
            for (const [key] of Object.entries(event.context)) {
                if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
                    event.context[key] = '[MASKED]';
                }
            }
        }
    }

    private getSeverityForViolation(violationType: string): ErrorSeverity {
        const severityMap: Record<string, ErrorSeverity> = {
            permission: ErrorSeverity.HIGH,
            path: ErrorSeverity.HIGH,
            domain: ErrorSeverity.CRITICAL,
            command: ErrorSeverity.CRITICAL,
            rate_limit: ErrorSeverity.MEDIUM,
        };

        return severityMap[violationType] || ErrorSeverity.MEDIUM;
    }

    private generateEventId(): string {
        return `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateSessionId(): string {
        return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    private async ensureLogDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.config.logPath, { recursive: true });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new BMadError('Failed to create MCP audit log directory', {
                code: 'MCP_AUDIT_004',
                severity: ErrorSeverity.CRITICAL,
                context: { path: this.config.logPath, error: errorMessage },
            });
        }
    }
}

// Configuration par défaut pour l'audit logger
export const DEFAULT_AUDIT_CONFIG: AuditLogConfig = {
    logPath: './logs/mcp',
    maxFileSize: 100 * 1024 * 1024, // 100MB
    rotationCount: 10,
    retentionDays: 90,
    sensitiveDataMasking: true,
    vaultIntegration: true,
    prometheusMetrics: true,
};
