/**
 * BMAD Configuration Validator
 * Validates unified bmad-config.yaml structure and compatibility
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { BMadError, ErrorSeverity } from '../core/ErrorHandler';

interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    score: number; // 0-100 configuration quality score
}

interface ValidationError {
    field: string;
    message: string;
    severity: 'critical' | 'high' | 'medium';
    code: string;
}

interface ValidationWarning {
    field: string;
    message: string;
    suggestion: string;
    code: string;
}

// Configuration schema interface - used for type documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ConfigSchema {
    version: string;
    project: {
        name: string;
        description: string;
        type: string;
        category: string;
    };
    security: {
        mcp: {
            enabled: boolean;
            global: Record<string, unknown>;
        };
    };
    agents: {
        specialized_agents: Array<{
            name: string;
            enabled: boolean;
            priority: string;
        }>;
    };
    environments: Record<string, unknown>;
    monitoring: Record<string, unknown>;
}

export class ConfigValidator {
    private readonly configPath: string;
    private readonly schemaPath: string;

    constructor(baseDir: string = process.cwd()) {
        this.configPath = path.join(baseDir, 'bmad-config.yaml');
        this.schemaPath = path.join(baseDir, 'schemas', 'bmad-config-schema.json');
    }

    /**
     * Validate the unified BMAD configuration
     */
    async validate(): Promise<ValidationResult> {
        const result: ValidationResult = {
            valid: true,
            errors: [],
            warnings: [],
            score: 100,
        };

        try {
            // 1. Check if config file exists
            if (!(await this.fileExists(this.configPath))) {
                result.errors.push({
                    field: 'config',
                    message: 'bmad-config.yaml file not found',
                    severity: 'critical',
                    code: 'CONFIG_NOT_FOUND',
                });
                result.valid = false;
                result.score = 0;
                return result;
            }

            // 2. Load and parse configuration
            const config = await this.loadConfig();

            // 3. Validate structure
            this.validateStructure(config, result);

            // 4. Validate semantic rules
            this.validateSemantics(config, result);

            // 5. Validate compatibility
            await this.validateCompatibility(config, result);

            // 6. Calculate quality score
            result.score = this.calculateQualityScore(result);

            // 7. Set overall validity
            result.valid = result.errors.length === 0;
        } catch (error) {
            const bmadError =
                error instanceof BMadError
                    ? error
                    : new BMadError(`Validation failed: ${error.message}`, {
                          code: 'VALIDATION_FAILED',
                          severity: ErrorSeverity.HIGH,
                      });

            result.errors.push({
                field: 'validation',
                message: bmadError.message,
                severity: 'critical',
                code: bmadError.code,
            });
            result.valid = false;
            result.score = 0;
        }

        return result;
    }

    /**
     * Validate basic configuration structure
     */
    private validateStructure(config: any, result: ValidationResult): void {
        const requiredFields = [
            'version',
            'project.name',
            'project.type',
            'project.category',
            'security.mcp',
            'agents.specialized_agents',
            'environments',
            'monitoring',
        ];

        for (const field of requiredFields) {
            if (!this.getNestedProperty(config, field)) {
                result.errors.push({
                    field,
                    message: `Required field missing: ${field}`,
                    severity: 'high',
                    code: 'MISSING_REQUIRED_FIELD',
                });
            }
        }

        // Validate version format
        if (config.version && !this.isValidVersion(config.version)) {
            result.warnings.push({
                field: 'version',
                message: `Version format may be invalid: ${config.version}`,
                suggestion: 'Use semantic versioning format (e.g., "3.0.0")',
                code: 'INVALID_VERSION_FORMAT',
            });
        }

        // Validate project type
        const validTypes = ['template', 'application', 'library', 'service'];
        if (config.project?.type && !validTypes.includes(config.project.type)) {
            result.warnings.push({
                field: 'project.type',
                message: `Unknown project type: ${config.project.type}`,
                suggestion: `Use one of: ${validTypes.join(', ')}`,
                code: 'UNKNOWN_PROJECT_TYPE',
            });
        }

        // Validate security level
        const validSecurityLevels = ['basic', 'standard', 'enhanced', 'enterprise', 'maximum'];
        if (
            config.project?.security_level &&
            !validSecurityLevels.includes(config.project.security_level)
        ) {
            result.warnings.push({
                field: 'project.security_level',
                message: `Unknown security level: ${config.project.security_level}`,
                suggestion: `Use one of: ${validSecurityLevels.join(', ')}`,
                code: 'UNKNOWN_SECURITY_LEVEL',
            });
        }
    }

    /**
     * Validate semantic rules and dependencies
     */
    private validateSemantics(config: any, result: ValidationResult): void {
        // Validate agent configurations
        if (config.agents?.specialized_agents) {
            this.validateAgents(config.agents.specialized_agents, result);
        }

        // Validate environment configurations
        if (config.environments) {
            this.validateEnvironments(config.environments, result);
        }

        // Validate MCP security configuration
        if (config.security?.mcp) {
            this.validateMCPSecurity(config.security.mcp, result);
        }

        // Validate monitoring configuration
        if (config.monitoring) {
            this.validateMonitoring(config.monitoring, result);
        }

        // Validate infrastructure alignment
        if (config.infrastructure && config.monitoring) {
            this.validateInfrastructureMonitoringAlignment(config, result);
        }
    }

    /**
     * Validate agent configurations
     */
    private validateAgents(agents: any[], result: ValidationResult): void {
        const requiredAgents = ['bmad-orchestrator', 'bmad-architect', 'bmad-dev', 'bmad-qa'];
        const foundAgents = agents.map((agent) => agent.name);

        for (const requiredAgent of requiredAgents) {
            if (!foundAgents.some((name) => name.includes(requiredAgent))) {
                result.errors.push({
                    field: 'agents.specialized_agents',
                    message: `Required agent missing: ${requiredAgent}`,
                    severity: 'high',
                    code: 'MISSING_REQUIRED_AGENT',
                });
            }
        }

        // Validate individual agent configurations
        agents.forEach((agent: any, index: number) => {
            if (!agent.name || typeof agent.enabled !== 'boolean') {
                result.errors.push({
                    field: `agents.specialized_agents[${index}]`,
                    message: 'Agent must have name and enabled properties',
                    severity: 'medium',
                    code: 'INVALID_AGENT_CONFIG',
                });
            }

            // Validate priority levels
            const validPriorities = ['low', 'medium', 'high', 'critical'];
            if (agent.priority && !validPriorities.includes(agent.priority)) {
                result.warnings.push({
                    field: `agents.specialized_agents[${index}].priority`,
                    message: `Unknown priority level: ${agent.priority}`,
                    suggestion: `Use one of: ${validPriorities.join(', ')}`,
                    code: 'UNKNOWN_PRIORITY_LEVEL',
                });
            }

            // Validate permissions if present
            if (agent.permissions) {
                this.validateAgentPermissions(
                    agent.permissions,
                    `agents.specialized_agents[${index}].permissions`,
                    result
                );
            }
        });
    }

    /**
     * Validate agent permissions
     */
    private validateAgentPermissions(
        permissions: any,
        fieldPath: string,
        result: ValidationResult
    ): void {
        const validLevels = ['low', 'medium', 'high', 'admin'];

        if (permissions.level && !validLevels.includes(permissions.level)) {
            result.warnings.push({
                field: `${fieldPath}.level`,
                message: `Unknown permission level: ${permissions.level}`,
                suggestion: `Use one of: ${validLevels.join(', ')}`,
                code: 'UNKNOWN_PERMISSION_LEVEL',
            });
        }

        // Validate rate limits
        if (permissions.rate_limits) {
            if (
                permissions.rate_limits.requests_per_minute &&
                permissions.rate_limits.requests_per_minute < 1
            ) {
                result.warnings.push({
                    field: `${fieldPath}.rate_limits.requests_per_minute`,
                    message: 'Rate limit should be at least 1 request per minute',
                    suggestion: 'Increase rate limit or remove if not needed',
                    code: 'LOW_RATE_LIMIT',
                });
            }
        }
    }

    /**
     * Validate environment configurations
     */
    private validateEnvironments(environments: any, result: ValidationResult): void {
        const requiredEnvironments = ['development', 'staging', 'production'];

        for (const env of requiredEnvironments) {
            if (!environments[env]) {
                result.warnings.push({
                    field: `environments.${env}`,
                    message: `Missing environment configuration: ${env}`,
                    suggestion: 'Add environment configuration for complete setup',
                    code: 'MISSING_ENVIRONMENT',
                });
            } else {
                // Validate individual environment
                if (typeof environments[env].enabled !== 'boolean') {
                    result.errors.push({
                        field: `environments.${env}.enabled`,
                        message: 'Environment enabled property must be boolean',
                        severity: 'medium',
                        code: 'INVALID_ENVIRONMENT_CONFIG',
                    });
                }
            }
        }

        // Production-specific validations
        if (environments.production) {
            if (environments.production.auto_deploy === true) {
                result.warnings.push({
                    field: 'environments.production.auto_deploy',
                    message: 'Auto-deploy enabled for production environment',
                    suggestion: 'Consider disabling auto-deploy for production safety',
                    code: 'PROD_AUTO_DEPLOY_RISK',
                });
            }

            if (!environments.production.approval_required) {
                result.warnings.push({
                    field: 'environments.production.approval_required',
                    message: 'Approval not required for production deployments',
                    suggestion: 'Enable approval requirement for production safety',
                    code: 'PROD_NO_APPROVAL',
                });
            }
        }
    }

    /**
     * Validate MCP security configuration
     */
    private validateMCPSecurity(mcpConfig: any, result: ValidationResult): void {
        if (!mcpConfig.enabled) {
            result.warnings.push({
                field: 'security.mcp.enabled',
                message: 'MCP security is disabled',
                suggestion: 'Enable MCP security for better protection',
                code: 'MCP_SECURITY_DISABLED',
            });
        }

        // Validate blocked commands
        if (mcpConfig.blocked_commands && Array.isArray(mcpConfig.blocked_commands)) {
            const criticalCommands = ['rm -rf', 'sudo', 'chmod 777'];
            for (const critical of criticalCommands) {
                if (!mcpConfig.blocked_commands.includes(critical)) {
                    result.warnings.push({
                        field: 'security.mcp.blocked_commands',
                        message: `Critical command not blocked: ${critical}`,
                        suggestion: 'Add critical commands to blocked list',
                        code: 'CRITICAL_COMMAND_NOT_BLOCKED',
                    });
                }
            }
        }

        // Validate rate limits
        if (mcpConfig.global?.rate_limits) {
            const rateLimits = mcpConfig.global.rate_limits;
            if (rateLimits.requests_per_minute > 1000) {
                result.warnings.push({
                    field: 'security.mcp.global.rate_limits.requests_per_minute',
                    message: 'Very high rate limit detected',
                    suggestion: 'Consider lowering rate limit for better security',
                    code: 'HIGH_RATE_LIMIT',
                });
            }
        }
    }

    /**
     * Validate monitoring configuration
     */
    private validateMonitoring(monitoring: any, result: ValidationResult): void {
        // Validate metrics configuration
        if (!monitoring.metrics?.enabled && monitoring.metrics?.provider) {
            result.warnings.push({
                field: 'monitoring.metrics',
                message: 'Metrics provider configured but not enabled',
                suggestion: 'Enable metrics or remove provider configuration',
                code: 'METRICS_NOT_ENABLED',
            });
        }

        // Validate alerting configuration
        if (monitoring.alerting?.enabled && !monitoring.alerting.channels) {
            result.errors.push({
                field: 'monitoring.alerting.channels',
                message: 'Alerting enabled but no channels configured',
                severity: 'medium',
                code: 'NO_ALERT_CHANNELS',
            });
        }

        // Validate retention periods
        if (monitoring.metrics?.retention) {
            const retention = monitoring.metrics.retention;
            if (retention.endsWith('d') && parseInt(retention) < 7) {
                result.warnings.push({
                    field: 'monitoring.metrics.retention',
                    message: 'Short metrics retention period',
                    suggestion: 'Consider longer retention for better analysis',
                    code: 'SHORT_RETENTION',
                });
            }
        }
    }

    /**
     * Validate infrastructure and monitoring alignment
     */
    private validateInfrastructureMonitoringAlignment(config: any, result: ValidationResult): void {
        // Check database monitoring alignment
        if (
            config.infrastructure?.databases?.postgresql &&
            !config.monitoring?.metrics?.exporters?.postgresql
        ) {
            result.warnings.push({
                field: 'monitoring.metrics.exporters.postgresql',
                message: 'PostgreSQL configured but monitoring not enabled',
                suggestion: 'Enable PostgreSQL monitoring for better observability',
                code: 'DB_MONITORING_MISSING',
            });
        }

        if (
            config.infrastructure?.databases?.redis &&
            !config.monitoring?.metrics?.exporters?.redis
        ) {
            result.warnings.push({
                field: 'monitoring.metrics.exporters.redis',
                message: 'Redis configured but monitoring not enabled',
                suggestion: 'Enable Redis monitoring for better observability',
                code: 'REDIS_MONITORING_MISSING',
            });
        }
    }

    /**
     * Validate compatibility with existing systems
     */
    private async validateCompatibility(config: any, result: ValidationResult): Promise<void> {
        // Check for DynamicAgentConfigurator compatibility
        if (config.agents && !config.agents.fallback_mechanism) {
            result.warnings.push({
                field: 'agents.fallback_mechanism',
                message: 'No fallback mechanism configured for agents',
                suggestion: 'Add fallback mechanism for DynamicAgentConfigurator compatibility',
                code: 'NO_AGENT_FALLBACK',
            });
        }

        // Check for ErrorHandler compatibility
        if (
            config.integrations?.error_handling?.enabled &&
            !config.integrations.error_handling.error_codes
        ) {
            result.warnings.push({
                field: 'integrations.error_handling.error_codes',
                message: 'Error handling enabled but no error codes defined',
                suggestion: 'Define error codes for BMadError compatibility',
                code: 'NO_ERROR_CODES',
            });
        }

        // Check migration metadata
        if (config.migration && config.migration.validation_status === 'pending') {
            result.warnings.push({
                field: 'migration.validation_status',
                message: 'Migration validation still pending',
                suggestion: 'Complete migration validation and update status',
                code: 'MIGRATION_VALIDATION_PENDING',
            });
        }
    }

    /**
     * Calculate configuration quality score
     */
    private calculateQualityScore(result: ValidationResult): number {
        let score = 100;

        // Deduct points for errors
        result.errors.forEach((error) => {
            switch (error.severity) {
                case 'critical':
                    score -= 25;
                    break;
                case 'high':
                    score -= 15;
                    break;
                case 'medium':
                    score -= 8;
                    break;
                default:
                    score -= 5;
            }
        });

        // Deduct points for warnings (less severe)
        score -= result.warnings.length * 2;

        return Math.max(0, score);
    }

    // Helper methods
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    private async loadConfig(): Promise<any> {
        const content = await fs.promises.readFile(this.configPath, 'utf8');
        return yaml.load(content);
    }

    private getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((current: any, key: string) => current?.[key], obj);
    }

    private isValidVersion(version: string): boolean {
        return /^\d+\.\d+\.\d+$/.test(version);
    }
}

export default ConfigValidator;
