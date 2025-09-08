// MCP Security Middleware - Enforcement des règles de whitelist en temps réel
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';

import { BMadError, ErrorSeverity } from './ErrorHandler';
import { Logger } from './Logger';
import { MCPAuditLogger, DEFAULT_AUDIT_CONFIG } from './MCPAuditLogger';

export interface WhitelistConfig {
    version: string;
    metadata: {
        created: string;
        description: string;
        integration: {
            error_handler: string;
            vault_audit: string;
            prometheus_metrics: string;
        };
    };
    global: {
        rate_limits: {
            requests_per_minute: number;
            burst_limit: number;
            window_seconds: number;
        };
        timeouts: {
            operation_timeout: number;
            connection_timeout: number;
        };
        audit: {
            enabled: boolean;
            sensitive_data_masking: boolean;
            retention_days: number;
        };
    };
    agents: Record<string, AgentPermissions>;
    commands: {
        blocked: string[];
        restricted: RestrictedCommand[];
    };
    integrations: {
        error_handling: {
            enabled: boolean;
            error_codes: Record<string, string>;
            severity_mapping: Record<string, string>;
        };
        vault_audit: {
            enabled: boolean;
            audit_path: string;
            include_context: boolean;
        };
        prometheus: {
            enabled: boolean;
            metrics: string[];
        };
    };
    environments: Record<string, EnvironmentConfig>;
}

export interface AgentPermissions {
    permissions: {
        level: string;
        allowed_operations: string[];
        allowed_paths: string[];
        blocked_paths: string[];
        domains?: {
            allowed: string[];
            blocked: string[];
        };
        file_operations?: {
            read: boolean;
            write: boolean;
            create: boolean;
            delete: boolean;
        };
    };
    rate_limits: {
        requests_per_minute: number;
        burst_limit: number;
    };
}

export interface RestrictedCommand {
    command: string;
    allowed_args: string[];
    blocked_args: string[];
}

export interface EnvironmentConfig {
    relaxed_mode?: boolean;
    rate_limits_multiplier?: number;
    additional_allowed_domains?: string[];
    strict_validation?: boolean;
    enhanced_logging?: boolean;
}

export interface MCPRequest {
    agent: string;
    operation: string;
    resource?: string;
    path?: string;
    domain?: string;
    command?: string;
    args?: string[];
    timestamp: number;
    metadata: Record<string, unknown>;
}

export interface RateLimitInfo {
    current: number;
    limit: number;
    windowStart: number;
    remaining: number;
}

export interface ValidationResult {
    allowed: boolean;
    reason?: string;
}

export class MCPSecurityMiddleware {
    private static instance: MCPSecurityMiddleware;
    private logger: Logger;
    private auditLogger: MCPAuditLogger;
    private config!: WhitelistConfig;
    private rateLimitCache: Map<string, RateLimitInfo> = new Map();
    private configPath: string;
    private lastConfigLoad: number = 0;
    private configReloadInterval: number = 30000; // 30 seconds

    private constructor(configPath: string, environment: string = 'development') {
        this.logger = Logger.getInstance();
        this.auditLogger = MCPAuditLogger.getInstance(DEFAULT_AUDIT_CONFIG);
        this.configPath = configPath;
        this.loadConfiguration();
        this.applyEnvironmentOverrides(environment);
        this.startConfigWatcher();
    }

    public static getInstance(configPath?: string, environment?: string): MCPSecurityMiddleware {
        if (!MCPSecurityMiddleware.instance) {
            if (!configPath) {
                throw new BMadError('MCPSecurityMiddleware requires initial configuration path', {
                    code: 'MCP_SECURITY_001',
                    severity: ErrorSeverity.CRITICAL,
                });
            }
            MCPSecurityMiddleware.instance = new MCPSecurityMiddleware(configPath, environment);
        }
        return MCPSecurityMiddleware.instance;
    }

    /**
     * Point d'entrée principal pour valider une requête MCP
     */
    public async validateRequest(request: MCPRequest): Promise<ValidationResult> {
        const startTime = Date.now();

        try {
            await this.reloadConfigIfNeeded();

            const validationSteps = [
                () => this.validateAgent(request),
                () => this.validateRateLimit(request),
                () => this.validateOperation(request),
                () => this.validatePath(request),
                () => this.validateDomain(request),
                () => this.validateCommand(request),
            ];

            for (const validate of validationSteps) {
                const result = await validate();
                if (!result.allowed) {
                    return result;
                }
            }

            await this.auditLogger.logSuccessfulOperation(
                request.agent,
                request.operation,
                request.resource || '',
                Date.now() - startTime,
                { validationDuration: Date.now() - startTime }
            );

            return { allowed: true };
        } catch (error: unknown) {
            return this.handleValidationError(error, request);
        }
    }

    private async validateAgent(request: MCPRequest): Promise<ValidationResult> {
        if (!this.isAgentRegistered(request.agent)) {
            await this.auditLogger.logWhitelistViolation(
                request.agent,
                request.operation,
                request.resource || '',
                'permission',
                { rule: 'agent_not_registered', attempted: request.agent }
            );
            return {
                allowed: false,
                reason: `Agent '${request.agent}' not registered in whitelist`,
            };
        }
        return { allowed: true };
    }

    private async validateRateLimit(request: MCPRequest): Promise<ValidationResult> {
        const rateLimitResult = await this.checkRateLimit(request.agent);
        if (!rateLimitResult.allowed) {
            await this.auditLogger.logWhitelistViolation(
                request.agent,
                request.operation,
                request.resource || '',
                'rate_limit',
                {
                    rule: 'rate_limit_exceeded',
                    current: rateLimitResult.current,
                    limit: rateLimitResult.limit,
                }
            );
            return { allowed: false, reason: rateLimitResult.reason };
        }
        return { allowed: true };
    }

    private async validateOperation(request: MCPRequest): Promise<ValidationResult> {
        const operationResult = this.checkOperationPermission(request.agent, request.operation);
        if (!operationResult.allowed) {
            await this.auditLogger.logWhitelistViolation(
                request.agent,
                request.operation,
                request.resource || '',
                'permission',
                {
                    rule: 'operation_not_allowed',
                    attempted: request.operation,
                    allowed: this.config.agents[request.agent]?.permissions.allowed_operations,
                }
            );
        }
        return operationResult;
    }

    private async validatePath(request: MCPRequest): Promise<ValidationResult> {
        if (!request.path) return { allowed: true };

        const pathResult = this.checkPathPermission(request.agent, request.path);
        if (!pathResult.allowed) {
            await this.auditLogger.logWhitelistViolation(
                request.agent,
                request.operation,
                request.resource || '',
                'path',
                {
                    rule: 'path_blocked',
                    attempted: request.path,
                    allowed: this.config.agents[request.agent]?.permissions.allowed_paths,
                }
            );
        }
        return pathResult;
    }

    private async validateDomain(request: MCPRequest): Promise<ValidationResult> {
        if (!request.domain) return { allowed: true };

        const domainResult = this.checkDomainPermission(request.agent, request.domain);
        if (!domainResult.allowed) {
            await this.auditLogger.logWhitelistViolation(
                request.agent,
                request.operation,
                request.resource || '',
                'domain',
                {
                    rule: 'domain_blocked',
                    attempted: request.domain,
                    allowed: this.config.agents[request.agent]?.permissions.domains?.allowed,
                }
            );
        }
        return domainResult;
    }

    private async validateCommand(request: MCPRequest): Promise<ValidationResult> {
        if (!request.command) return { allowed: true };

        const commandResult = this.checkCommandPermission(request.command, request.args);
        if (!commandResult.allowed) {
            await this.auditLogger.logWhitelistViolation(
                request.agent,
                request.operation,
                request.resource || '',
                'command',
                {
                    rule: 'command_blocked',
                    attempted: request.command,
                    args: request.args,
                }
            );
        }
        return commandResult;
    }

    private async handleValidationError(
        error: unknown,
        request: MCPRequest
    ): Promise<ValidationResult> {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const securityError = new BMadError('MCP security validation failed', {
            code: 'MCP_SECURITY_002',
            severity: ErrorSeverity.HIGH,
            context: { request, error: errorMessage },
        });

        await this.auditLogger.logMCPError(
            request.agent,
            request.operation,
            securityError,
            request.resource
        );

        throw securityError;
    }

    private async loadConfiguration(): Promise<void> {
        try {
            const configData = await fs.readFile(this.configPath, 'utf8');
            this.config = yaml.load(configData) as WhitelistConfig;
            this.lastConfigLoad = Date.now();

            this.logger.warn('MCP whitelist configuration loaded', {
                version: this.config.version,
                agentCount: Object.keys(this.config.agents).length,
                configPath: this.configPath,
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new BMadError('Failed to load MCP whitelist configuration', {
                code: 'MCP_SECURITY_003',
                severity: ErrorSeverity.CRITICAL,
                context: { configPath: this.configPath, error: errorMessage },
            });
        }
    }

    private applyEnvironmentOverrides(environment: string): void {
        const envConfig = this.config.environments[environment];
        if (!envConfig) {
            this.logger.warn('No environment-specific config found, using defaults', {
                environment,
            });
            return;
        }

        if (envConfig.rate_limits_multiplier) {
            for (const agent of Object.values(this.config.agents)) {
                agent.rate_limits.requests_per_minute *= envConfig.rate_limits_multiplier;
                agent.rate_limits.burst_limit *= envConfig.rate_limits_multiplier;
            }
        }

        if (envConfig.additional_allowed_domains) {
            for (const agent of Object.values(this.config.agents)) {
                if (agent.permissions.domains) {
                    agent.permissions.domains.allowed.push(...envConfig.additional_allowed_domains);
                }
            }
        }

        this.logger.warn('Environment overrides applied', { environment, config: envConfig });
    }

    private isAgentRegistered(agent: string): boolean {
        return agent in this.config.agents;
    }

    private async checkRateLimit(
        agent: string
    ): Promise<{ allowed: boolean; current: number; limit: number; reason?: string }> {
        const agentConfig = this.config.agents[agent];
        if (!agentConfig) {
            return { allowed: false, current: 0, limit: 0, reason: 'Agent not found' };
        }

        const now = Date.now();
        const windowMs = this.config.global.rate_limits.window_seconds * 1000;
        const key = `${agent}:${Math.floor(now / windowMs)}`;

        let rateLimitInfo = this.rateLimitCache.get(key);
        if (!rateLimitInfo) {
            rateLimitInfo = {
                current: 0,
                limit: agentConfig.rate_limits.requests_per_minute,
                windowStart: Math.floor(now / windowMs) * windowMs,
                remaining: agentConfig.rate_limits.requests_per_minute,
            };
        }

        rateLimitInfo.current++;
        rateLimitInfo.remaining = Math.max(0, rateLimitInfo.limit - rateLimitInfo.current);
        this.rateLimitCache.set(key, rateLimitInfo);

        this.cleanupRateLimitCache(now, windowMs);

        const allowed = rateLimitInfo.current <= rateLimitInfo.limit;
        return {
            allowed,
            current: rateLimitInfo.current,
            limit: rateLimitInfo.limit,
            reason: allowed
                ? undefined
                : `Rate limit exceeded: ${rateLimitInfo.current}/${rateLimitInfo.limit}`,
        };
    }

    private checkOperationPermission(agent: string, operation: string): ValidationResult {
        const agentConfig = this.config.agents[agent];
        if (!agentConfig) {
            return { allowed: false, reason: 'Agent not found' };
        }

        const allowed = agentConfig.permissions.allowed_operations.includes(operation);
        return {
            allowed,
            reason: allowed
                ? undefined
                : `Operation '${operation}' not allowed for agent '${agent}'`,
        };
    }

    private checkPathPermission(agent: string, requestPath: string): ValidationResult {
        const agentConfig = this.config.agents[agent];
        if (!agentConfig) {
            return { allowed: false, reason: 'Agent not found' };
        }

        for (const blockedPath of agentConfig.permissions.blocked_paths) {
            if (this.matchesPattern(requestPath, blockedPath)) {
                return { allowed: false, reason: `Path '${requestPath}' is blocked` };
            }
        }

        for (const allowedPath of agentConfig.permissions.allowed_paths) {
            if (this.matchesPattern(requestPath, allowedPath)) {
                return { allowed: true };
            }
        }

        return { allowed: false, reason: `Path '${requestPath}' not in allowed paths` };
    }

    private checkDomainPermission(agent: string, domain: string): ValidationResult {
        const agentConfig = this.config.agents[agent];
        if (!agentConfig?.permissions.domains) {
            return { allowed: true };
        }

        for (const blockedDomain of agentConfig.permissions.domains.blocked) {
            if (this.matchesDomainPattern(domain, blockedDomain)) {
                return { allowed: false, reason: `Domain '${domain}' is blocked` };
            }
        }

        for (const allowedDomain of agentConfig.permissions.domains.allowed) {
            if (this.matchesDomainPattern(domain, allowedDomain)) {
                return { allowed: true };
            }
        }

        return { allowed: false, reason: `Domain '${domain}' not in allowed domains` };
    }

    private checkCommandPermission(command: string, args: string[] = []): ValidationResult {
        if (this.config.commands.blocked.includes(command)) {
            return { allowed: false, reason: `Command '${command}' is blocked` };
        }

        const restrictedCommand = this.config.commands.restricted.find(
            (cmd) => cmd.command === command
        );
        if (restrictedCommand) {
            for (const arg of args) {
                if (restrictedCommand.blocked_args.includes(arg)) {
                    return {
                        allowed: false,
                        reason: `Command '${command}' with arg '${arg}' is blocked`,
                    };
                }
            }

            if (restrictedCommand.allowed_args.length > 0) {
                for (const arg of args) {
                    if (!restrictedCommand.allowed_args.includes(arg)) {
                        return {
                            allowed: false,
                            reason: `Command '${command}' with arg '${arg}' is not allowed`,
                        };
                    }
                }
            }
        }

        return { allowed: true };
    }

    private matchesPattern(path: string, pattern: string): boolean {
        const regexPattern = pattern
            .replace(/\*\*/g, '___DOUBLESTAR___')
            .replace(/\*/g, '[^/]*')
            .replace(/___DOUBLESTAR___/g, '.*');

        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(path);
    }

    private matchesDomainPattern(domain: string, pattern: string): boolean {
        const regexPattern = pattern.replace(/\*/g, '[^.]*');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(domain);
    }

    private cleanupRateLimitCache(now: number, windowMs: number): void {
        const cutoff = now - windowMs * 2;
        const keysToDelete: string[] = [];

        for (const [key, rateLimitInfo] of Array.from(this.rateLimitCache.entries())) {
            if (rateLimitInfo.windowStart < cutoff) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            this.rateLimitCache.delete(key);
        }
    }

    private async reloadConfigIfNeeded(): Promise<void> {
        const now = Date.now();
        if (now - this.lastConfigLoad > this.configReloadInterval) {
            try {
                const stats = await fs.stat(this.configPath);
                if (stats.mtime.getTime() > this.lastConfigLoad) {
                    await this.loadConfiguration();
                    this.logger.warn('MCP whitelist configuration reloaded due to file changes');
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error('Failed to check config file for reload', {
                    error: errorMessage,
                });
            }
        }
    }

    private startConfigWatcher(): void {
        setInterval(async () => {
            await this.reloadConfigIfNeeded();
        }, this.configReloadInterval);
    }

    public getStats(): {
        rateLimitCacheSize: number;
        configLastLoaded: number;
        agentCount: number;
    } {
        return {
            rateLimitCacheSize: this.rateLimitCache.size,
            configLastLoaded: this.lastConfigLoad,
            agentCount: Object.keys(this.config.agents).length,
        };
    }
}
