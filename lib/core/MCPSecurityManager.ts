// MCP Security Manager - Orchestrateur principal pour la sécurité MCP dans BMAD
import { BMadError, ErrorSeverity } from './ErrorHandler';
import { Logger } from './Logger';
import { MCPAuditLogger, DEFAULT_AUDIT_CONFIG } from './MCPAuditLogger';
import { MCPSecurityMiddleware, MCPRequest, ValidationResult } from './MCPSecurityMiddleware';

export interface MCPSecurityConfig {
    whitelistConfigPath: string;
    auditLogPath: string;
    environment: 'development' | 'staging' | 'production';
    enableVaultIntegration: boolean;
    enablePrometheusMetrics: boolean;
    rateLimitingEnabled: boolean;
}

export interface SecurityStats {
    totalRequests: number;
    blockedRequests: number;
    allowedRequests: number;
    rateLimitedRequests: number;
    errorCount: number;
    uptime: number;
    middlewareStats: {
        rateLimitCacheSize: number;
        configLastLoaded: number;
        agentCount: number;
    };
    auditLogStats: {
        logFileSize: number;
        lastRotation: number;
    };
}

export class MCPSecurityManager {
    private static instance: MCPSecurityManager;
    private logger: Logger;
    private auditLogger!: MCPAuditLogger;
    private middleware!: MCPSecurityMiddleware;
    private config: MCPSecurityConfig;
    private startTime: number;
    private stats: SecurityStats;

    private constructor(config: MCPSecurityConfig) {
        this.config = config;
        this.startTime = Date.now();
        this.logger = Logger.getInstance();

        // Initialisation des statistiques
        this.stats = {
            totalRequests: 0,
            blockedRequests: 0,
            allowedRequests: 0,
            rateLimitedRequests: 0,
            errorCount: 0,
            uptime: 0,
            middlewareStats: {
                rateLimitCacheSize: 0,
                configLastLoaded: 0,
                agentCount: 0,
            },
            auditLogStats: {
                logFileSize: 0,
                lastRotation: 0,
            },
        };

        this.initializeComponents();
        this.logger.warn('MCP Security Manager initialized', {
            environment: config.environment,
            whitelistConfig: config.whitelistConfigPath,
            auditLogPath: config.auditLogPath,
        });
    }

    public static getInstance(config?: MCPSecurityConfig): MCPSecurityManager {
        if (!MCPSecurityManager.instance) {
            if (!config) {
                throw new BMadError('MCPSecurityManager requires initial configuration', {
                    code: 'MCP_SECURITY_MGR_001',
                    severity: ErrorSeverity.CRITICAL,
                });
            }
            MCPSecurityManager.instance = new MCPSecurityManager(config);
        }
        return MCPSecurityManager.instance;
    }

    /**
     * Point d'entrée principal pour valider les requêtes MCP
     * Intégré avec le système d'agents BMAD existant
     */
    public async validateMCPRequest(
        agent: string,
        operation: string,
        resource?: string,
        additionalContext?: Record<string, unknown>
    ): Promise<ValidationResult> {
        const request: MCPRequest = {
            agent,
            operation,
            resource,
            timestamp: Date.now(),
            metadata: additionalContext || {},
            ...this.extractRequestDetails(additionalContext),
        };

        this.stats.totalRequests++;

        try {
            const result = await this.middleware.validateRequest(request);

            if (result.allowed) {
                this.stats.allowedRequests++;
                await this.logSuccessfulValidation(request);
            } else {
                this.stats.blockedRequests++;
                if (result.reason?.includes('Rate limit')) {
                    this.stats.rateLimitedRequests++;
                }
                await this.logBlockedRequest(request, result.reason || 'Unknown');
            }

            return result;
        } catch (error: unknown) {
            this.stats.errorCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            const securityError = new BMadError('MCP security validation failed', {
                code: 'MCP_SECURITY_MGR_002',
                severity: ErrorSeverity.HIGH,
                context: { request, error: errorMessage },
            });

            await this.auditLogger.logMCPError(agent, operation, securityError, resource);
            throw securityError;
        }
    }

    /**
     * Intégration avec DynamicAgentConfigurator existant
     */
    public async validateAgentOperation(
        agentId: string,
        operationType: string,
        targetResource?: string,
        context?: Record<string, unknown>
    ): Promise<boolean> {
        try {
            const result = await this.validateMCPRequest(
                agentId,
                operationType,
                targetResource,
                context
            );
            return result.allowed;
        } catch (error: unknown) {
            this.logger.error('Agent operation validation failed', {
                agentId,
                operationType,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }

    /**
     * Méthode pour valider les opérations de fichiers avec chemins
     */
    public async validateFileOperation(
        agent: string,
        operation: 'read' | 'write' | 'create' | 'delete',
        filePath: string,
        context?: Record<string, unknown>
    ): Promise<ValidationResult> {
        return this.validateMCPRequest(agent, `file_${operation}`, filePath, {
            ...context,
            path: filePath,
            fileOperation: operation,
        });
    }

    /**
     * Méthode pour valider les opérations réseau avec domaines
     */
    public async validateNetworkOperation(
        agent: string,
        operation: string,
        domain: string,
        context?: Record<string, unknown>
    ): Promise<ValidationResult> {
        return this.validateMCPRequest(agent, operation, domain, {
            ...context,
            domain,
            networkOperation: true,
        });
    }

    /**
     * Méthode pour valider les commandes système
     */
    public async validateSystemCommand(
        agent: string,
        command: string,
        args: string[] = [],
        context?: Record<string, unknown>
    ): Promise<ValidationResult> {
        return this.validateMCPRequest(agent, 'system_command', command, {
            ...context,
            command,
            args,
            systemCommand: true,
        });
    }

    /**
     * Obtenir les statistiques de sécurité
     */
    public getSecurityStats(): SecurityStats {
        this.stats.uptime = Date.now() - this.startTime;
        this.stats.middlewareStats = this.middleware.getStats();

        return { ...this.stats };
    }

    /**
     * Méthode pour obtenir le statut de santé du système de sécurité
     */
    public getHealthStatus(): {
        status: 'healthy' | 'degraded' | 'unhealthy';
        checks: Record<string, boolean>;
        details: Record<string, unknown>;
    } {
        const checks = {
            middlewareOperational: true,
            auditLoggerOperational: true,
            configLoadedRecently: this.isConfigFresh(),
            errorRateAcceptable: this.isErrorRateAcceptable(),
            rateLimitCacheSizeNormal: this.isRateLimitCacheSizeNormal(),
        };

        const failedChecks = Object.values(checks).filter((check) => !check).length;
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

        if (failedChecks > 0) {
            status = failedChecks > 2 ? 'unhealthy' : 'degraded';
        }

        return {
            status,
            checks,
            details: {
                stats: this.getSecurityStats(),
                uptime: Date.now() - this.startTime,
                environment: this.config.environment,
            },
        };
    }

    /**
     * Méthode pour recharger la configuration de sécurité
     */
    public async reloadConfiguration(): Promise<void> {
        try {
            // Le middleware gère automatiquement le rechargement,
            // mais nous pouvons forcer un rechargement ici si nécessaire
            this.logger.warn('Security configuration reload requested');

            // Réinitialiser les statistiques si nécessaire
            this.resetStatsIfNeeded();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new BMadError('Failed to reload security configuration', {
                code: 'MCP_SECURITY_MGR_003',
                severity: ErrorSeverity.HIGH,
                context: { error: errorMessage },
            });
        }
    }

    /**
     * Méthode pour créer un rapport d'audit
     */
    public async generateAuditReport(
        _startDate: Date,
        _endDate: Date
    ): Promise<{
        summary: Record<string, number>;
        topViolatingAgents: Array<{ agent: string; violations: number }>;
        commonViolationTypes: Array<{ type: string; count: number }>;
        securityTrends: Array<{ date: string; violations: number; requests: number }>;
    }> {
        // Cette méthode nécessiterait l'analyse des logs d'audit
        // Pour l'instant, retournons des données de base
        const stats = this.getSecurityStats();

        return {
            summary: {
                totalRequests: stats.totalRequests,
                blockedRequests: stats.blockedRequests,
                allowedRequests: stats.allowedRequests,
                rateLimitedRequests: stats.rateLimitedRequests,
                errorCount: stats.errorCount,
            },
            topViolatingAgents: [],
            commonViolationTypes: [
                { type: 'rate_limit', count: stats.rateLimitedRequests },
                { type: 'permission', count: stats.blockedRequests - stats.rateLimitedRequests },
            ],
            securityTrends: [],
        };
    }

    private initializeComponents(): void {
        try {
            // Initialiser l'audit logger avec la configuration personnalisée
            const auditConfig = {
                ...DEFAULT_AUDIT_CONFIG,
                logPath: this.config.auditLogPath,
                vaultIntegration: this.config.enableVaultIntegration,
                prometheusMetrics: this.config.enablePrometheusMetrics,
            };

            this.auditLogger = MCPAuditLogger.getInstance(auditConfig);

            // Initialiser le middleware de sécurité
            this.middleware = MCPSecurityMiddleware.getInstance(
                this.config.whitelistConfigPath,
                this.config.environment
            );
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new BMadError('Failed to initialize MCP security components', {
                code: 'MCP_SECURITY_MGR_004',
                severity: ErrorSeverity.CRITICAL,
                context: { config: this.config, error: errorMessage },
            });
        }
    }

    private extractRequestDetails(context?: Record<string, unknown>): Partial<MCPRequest> {
        if (!context) return {};

        return {
            path: context.path as string,
            domain: context.domain as string,
            command: context.command as string,
            args: context.args as string[],
        };
    }

    private async logSuccessfulValidation(request: MCPRequest): Promise<void> {
        this.logger.warn('MCP request validated successfully', {
            agent: request.agent,
            operation: request.operation,
            resource: request.resource,
        });
    }

    private async logBlockedRequest(request: MCPRequest, reason: string): Promise<void> {
        this.logger.error('MCP request blocked', {
            agent: request.agent,
            operation: request.operation,
            resource: request.resource,
            reason,
        });
    }

    private isConfigFresh(): boolean {
        const stats = this.middleware.getStats();
        const configAge = Date.now() - stats.configLastLoaded;
        return configAge < 300000; // 5 minutes
    }

    private isErrorRateAcceptable(): boolean {
        if (this.stats.totalRequests === 0) return true;
        const errorRate = this.stats.errorCount / this.stats.totalRequests;
        return errorRate < 0.1; // Moins de 10% d'erreurs
    }

    private isRateLimitCacheSizeNormal(): boolean {
        const stats = this.middleware.getStats();
        return stats.rateLimitCacheSize < 10000; // Cache pas trop volumineux
    }

    private resetStatsIfNeeded(): void {
        const uptime = Date.now() - this.startTime;
        const oneDayMs = 24 * 60 * 60 * 1000;

        // Réinitialiser les statistiques chaque jour
        if (uptime > oneDayMs) {
            const oldStats = { ...this.stats };
            this.stats = {
                totalRequests: 0,
                blockedRequests: 0,
                allowedRequests: 0,
                rateLimitedRequests: 0,
                errorCount: 0,
                uptime: 0,
                middlewareStats: {
                    rateLimitCacheSize: 0,
                    configLastLoaded: 0,
                    agentCount: 0,
                },
                auditLogStats: {
                    logFileSize: 0,
                    lastRotation: 0,
                },
            };

            this.startTime = Date.now();
            this.logger.warn('Security statistics reset', { oldStats });
        }
    }
}

// Configuration par défaut pour différents environnements
export const DEFAULT_SECURITY_CONFIGS: Record<string, MCPSecurityConfig> = {
    development: {
        whitelistConfigPath: './configs/mcp/whitelist.yaml',
        auditLogPath: './logs/mcp',
        environment: 'development',
        enableVaultIntegration: false,
        enablePrometheusMetrics: false,
        rateLimitingEnabled: true,
    },
    staging: {
        whitelistConfigPath: './configs/mcp/whitelist.yaml',
        auditLogPath: './logs/mcp',
        environment: 'staging',
        enableVaultIntegration: true,
        enablePrometheusMetrics: true,
        rateLimitingEnabled: true,
    },
    production: {
        whitelistConfigPath: './configs/mcp/whitelist.yaml',
        auditLogPath: './logs/mcp',
        environment: 'production',
        enableVaultIntegration: true,
        enablePrometheusMetrics: true,
        rateLimitingEnabled: true,
    },
};
