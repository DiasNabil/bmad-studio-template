/**
 * BMAD Configuration Migration Utility
 * Migrates configurations from legacy formats to unified bmad-config.yaml
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { BMadError, ErrorSeverity } from '../core/ErrorHandler';

interface MigrationResult {
    success: boolean;
    migratedFiles: string[];
    errors: string[];
    warnings: string[];
    backupPath?: string;
}

interface LegacyConfig {
    source: string;
    content: any;
    format: 'yaml' | 'json';
}

interface MCPAgentConfig {
    permissions?: {
        level?: string;
        allowed_operations?: string[];
        allowed_paths?: string[];
        blocked_paths?: string[];
        file_operations?: {
            read?: boolean;
            write?: boolean;
            create?: boolean;
            delete?: boolean;
        };
        rate_limits?: {
            requests_per_minute?: number;
            burst_limit?: number;
        };
        domains?: {
            allowed?: string[];
            blocked?: string[];
        };
    };
}

interface SpecializedAgent {
    name: string;
    enabled: boolean;
    priority: string;
    permissions?: MCPAgentConfig['permissions'];
}

export class ConfigMigrator {
    private readonly baseDir: string;
    private readonly configPath: string;
    private readonly backupDir: string;

    constructor(baseDir: string = process.cwd()) {
        this.baseDir = baseDir;
        this.configPath = path.join(baseDir, 'bmad-config.yaml');
        this.backupDir = path.join(baseDir, '.migration-backup');
    }

    /**
     * Execute complete migration from legacy configs to unified bmad-config.yaml
     */
    async migrate(): Promise<MigrationResult> {
        const result: MigrationResult = {
            success: false,
            migratedFiles: [],
            errors: [],
            warnings: [],
        };

        try {
            // 1. Create backup directory
            await this.createBackupDirectory();
            result.backupPath = this.backupDir;

            // 2. Detect and load legacy configurations
            const legacyConfigs = await this.detectLegacyConfigs();

            if (legacyConfigs.length === 0) {
                result.warnings.push('No legacy configuration files found');
                result.success = true;
                return result;
            }

            // 3. Backup original files
            await this.backupOriginalFiles(legacyConfigs);

            // 4. Check if unified config already exists
            if (await this.unifiedConfigExists()) {
                result.warnings.push(
                    'bmad-config.yaml already exists, merging with legacy configs'
                );
            }

            // 5. Merge configurations
            const mergedConfig = await this.mergeConfigurations(legacyConfigs);

            // 6. Validate merged configuration
            const validationResult = await this.validateConfiguration(mergedConfig);
            if (!validationResult.valid) {
                result.errors.push(...validationResult.errors);
                throw new BMadError('Configuration validation failed', {
                    code: 'CONFIG_VALIDATION_FAILED',
                    severity: ErrorSeverity.HIGH,
                });
            }

            // 7. Write unified configuration
            await this.writeUnifiedConfig(mergedConfig);

            // 8. Update references in code
            await this.updateCodeReferences();

            result.migratedFiles = legacyConfigs.map((config) => config.source);
            result.success = true;
            result.warnings.push(...validationResult.warnings);
        } catch (error) {
            const bmadError =
                error instanceof BMadError
                    ? error
                    : new BMadError(`Migration failed: ${error.message}`, {
                          code: 'MIGRATION_FAILED',
                          severity: ErrorSeverity.CRITICAL,
                      });

            result.errors.push(bmadError.message);
            result.success = false;
        }

        return result;
    }

    /**
     * Detect legacy configuration files
     */
    private async detectLegacyConfigs(): Promise<LegacyConfig[]> {
        const legacyConfigs: LegacyConfig[] = [];

        const configPaths = [
            '.bmad-core/core-config.yaml',
            '.bmad-core/project-metadata.json',
            'configs/mcp/whitelist.yaml',
            'configs/agents/contains-registry.yaml',
            'configs/security/security-config.yaml',
            'configs/monitoring/prometheus-config.yaml',
        ];

        for (const configPath of configPaths) {
            const fullPath = path.join(this.baseDir, configPath);

            if (await this.fileExists(fullPath)) {
                try {
                    const content = await this.loadConfigFile(fullPath);
                    const format = path.extname(configPath).slice(1) as 'yaml' | 'json';

                    legacyConfigs.push({
                        source: configPath,
                        content,
                        format,
                    });
                } catch (error) {
                    console.warn(`Failed to load config: ${configPath}`, error);
                }
            }
        }

        return legacyConfigs;
    }

    /**
     * Merge legacy configurations into unified structure
     */
    private async mergeConfigurations(legacyConfigs: LegacyConfig[]): Promise<any> {
        // Load base unified config if exists
        let unifiedConfig: any = {};

        if (await this.unifiedConfigExists()) {
            unifiedConfig = await this.loadConfigFile(this.configPath);
        }

        // Process each legacy config
        for (const legacyConfig of legacyConfigs) {
            switch (path.basename(legacyConfig.source)) {
                case 'core-config.yaml':
                    unifiedConfig = this.mergeCoreConfig(unifiedConfig, legacyConfig.content);
                    break;

                case 'project-metadata.json':
                    unifiedConfig = this.mergeProjectMetadata(unifiedConfig, legacyConfig.content);
                    break;

                case 'whitelist.yaml':
                    unifiedConfig = this.mergeMCPConfig(unifiedConfig, legacyConfig.content);
                    break;

                case 'contains-registry.yaml':
                    unifiedConfig = this.mergeAgentRegistry(unifiedConfig, legacyConfig.content);
                    break;

                default:
                    console.warn(`Unknown config type: ${legacyConfig.source}`);
            }
        }

        // Set migration metadata
        unifiedConfig.migration = {
            version: '1.0',
            created: new Date().toISOString().split('T')[0],
            source_files: legacyConfigs.map((config) => config.source),
            compatibility: {
                DynamicAgentConfigurator: true,
                MCPSecurityManager: true,
                ErrorHandler: true,
                PrometheusMetrics: true,
            },
            validation_status: 'migrated',
            migration_tests: 'required',
            rollback_plan: 'automatic',
        };

        return unifiedConfig;
    }

    /**
     * Merge core configuration
     */
    private mergeCoreConfig(unified: any, coreConfig: any): any {
        // Merge project metadata
        unified.project = {
            ...unified.project,
            name: coreConfig.metadata?.name || unified.project?.name,
            description: coreConfig.metadata?.description || unified.project?.description,
            version: coreConfig.version || unified.version,
            type: coreConfig.project?.type || unified.project?.type,
            category: coreConfig.project?.category || unified.project?.category,
            security_level: coreConfig.project?.security_level || unified.project?.security_level,
            compliance: coreConfig.project?.compliance || unified.project?.compliance,
        };

        // Merge environments
        if (coreConfig.environments) {
            unified.environments = {
                ...unified.environments,
                ...coreConfig.environments,
            };
        }

        // Merge agents configuration
        if (coreConfig.agents) {
            unified.agents = {
                ...unified.agents,
                validation_required: coreConfig.agents.validation_required,
                fallback_enabled: coreConfig.agents.fallback_enabled,
                parallel_execution: coreConfig.agents.parallel_execution,
            };

            // Merge specialized agents
            if (coreConfig.agents.specialized_agents) {
                unified.agents.specialized_agents = [
                    ...(unified.agents?.specialized_agents || []),
                    ...coreConfig.agents.specialized_agents.map((agent) => ({
                        name: agent.name,
                        enabled: agent.enabled,
                        priority: agent.priority,
                    })),
                ];
            }
        }

        // Merge infrastructure
        if (coreConfig.infrastructure) {
            unified.infrastructure = {
                ...unified.infrastructure,
                ...coreConfig.infrastructure,
            };
        }

        // Merge monitoring
        if (coreConfig.monitoring) {
            unified.monitoring = {
                ...unified.monitoring,
                ...coreConfig.monitoring,
            };
        }

        return unified;
    }

    /**
     * Merge project metadata
     */
    private mergeProjectMetadata(unified: any, metadata: any): any {
        if (!unified.project) unified.project = {};

        unified.project = {
            ...unified.project,
            ...metadata,
            created: metadata.created || new Date().toISOString().split('T')[0],
            last_updated: new Date().toISOString().split('T')[0],
        };

        return unified;
    }

    /**
     * Merge MCP configuration
     */
    private mergeMCPConfig(unified: any, mcpConfig: any): any {
        if (!unified.security) unified.security = {};

        unified.security.mcp = {
            version: mcpConfig.version || '1.0',
            enabled: true,
            global: mcpConfig.global || {},
            blocked_commands: mcpConfig.commands?.blocked || [],
            restricted_commands: {},
        };

        // Convert restricted commands format
        if (mcpConfig.commands?.restricted) {
            for (const cmd of mcpConfig.commands.restricted) {
                unified.security.mcp.restricted_commands[cmd.command] = {
                    allowed_args: cmd.allowed_args,
                    blocked_args: cmd.blocked_args,
                };
            }
        }

        // Merge agent permissions
        if (mcpConfig.agents && unified.agents?.specialized_agents) {
            for (const [agentName, agentConfig] of Object.entries(mcpConfig.agents)) {
                const typedAgentConfig = agentConfig as MCPAgentConfig;
                const existingAgent = unified.agents.specialized_agents.find(
                    (agent: SpecializedAgent) =>
                        agent.name === agentName || agent.name.includes(agentName)
                );

                if (existingAgent && typedAgentConfig.permissions) {
                    existingAgent.permissions = typedAgentConfig.permissions;
                }
            }
        }

        return unified;
    }

    /**
     * Merge agent registry
     */
    private mergeAgentRegistry(unified: any, registry: any): any {
        if (!unified.agents) unified.agents = {};

        if (registry.agents) {
            unified.agents.content_agents = registry.agents.map((agent) => ({
                id: agent.id,
                name: agent.name,
                match_patterns: agent.matchPatterns,
                priority: agent.priority,
                tags: agent.tags,
                configuration: {
                    case_sensitive: agent.configuration?.caseSensitive,
                    match_threshold: agent.configuration?.matchThreshold,
                    fuzzy_match_level: agent.configuration?.fuzzyMatchLevel,
                    allow_typos: agent.configuration?.allowTypos,
                },
            }));
        }

        return unified;
    }

    /**
     * Validate merged configuration
     */
    private async validateConfiguration(
        config: any
    ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
        const result = { valid: true, errors: [], warnings: [] };

        // Required fields validation
        const requiredFields = [
            'version',
            'project.name',
            'project.type',
            'agents.specialized_agents',
            'environments',
        ];

        for (const field of requiredFields) {
            if (!this.getNestedProperty(config, field)) {
                result.errors.push(`Missing required field: ${field}`);
                result.valid = false;
            }
        }

        // Version validation
        if (config.version && !this.isValidVersion(config.version)) {
            result.warnings.push(`Version format may be invalid: ${config.version}`);
        }

        // Agent validation
        if (config.agents?.specialized_agents) {
            for (const agent of config.agents.specialized_agents) {
                if (!agent.name || !agent.enabled === undefined) {
                    result.errors.push(`Invalid agent configuration: ${JSON.stringify(agent)}`);
                    result.valid = false;
                }
            }
        }

        // Environment validation
        const environments = ['development', 'staging', 'production'];
        for (const env of environments) {
            if (!config.environments?.[env]) {
                result.warnings.push(`Missing environment configuration: ${env}`);
            }
        }

        return result;
    }

    /**
     * Update code references to use new unified config
     */
    private async updateCodeReferences(): Promise<void> {
        const filesToUpdate = await this.findFilesWithConfigReferences();

        for (const filePath of filesToUpdate) {
            try {
                await this.updateFileReferences(filePath);
            } catch (error) {
                console.warn(`Failed to update references in ${filePath}:`, error);
            }
        }
    }

    /**
     * Find files that reference old config paths
     */
    private async findFilesWithConfigReferences(): Promise<string[]> {
        // This would use a more sophisticated search in a real implementation
        // const _commonPaths = [
        //   'lib/**/*.ts',
        //   'lib/**/*.js',
        //   'bin/**/*.js'
        // ];

        // Simplified implementation - return known files
        return [
            path.join(this.baseDir, 'lib/configurators/AgentConfigurator.ts'),
            path.join(this.baseDir, 'lib/core/DynamicAgentConfigurator.js'),
        ];
    }

    /**
     * Update file references to point to new config
     */
    private async updateFileReferences(filePath: string): Promise<void> {
        if (!(await this.fileExists(filePath))) return;

        const content = await fs.promises.readFile(filePath, 'utf8');

        // Replace common config path references
        const updatedContent = content
            .replace(/\.bmad-core\/core-config\.yaml/g, 'bmad-config.yaml')
            .replace(/configs\/mcp\/whitelist\.yaml/g, 'bmad-config.yaml')
            .replace(/configs\/agents\/contains-registry\.yaml/g, 'bmad-config.yaml')
            // Add comment about migration
            .replace(
                /^(import.*config.*from)/gm,
                '// Config migrated to unified bmad-config.yaml\n$1'
            );

        if (content !== updatedContent) {
            await fs.promises.writeFile(filePath, updatedContent, 'utf8');
        }
    }

    // Helper methods
    private async createBackupDirectory(): Promise<void> {
        if (!(await this.fileExists(this.backupDir))) {
            await fs.promises.mkdir(this.backupDir, { recursive: true });
        }
    }

    private async backupOriginalFiles(configs: LegacyConfig[]): Promise<void> {
        for (const config of configs) {
            const sourcePath = path.join(this.baseDir, config.source);
            const backupPath = path.join(this.backupDir, config.source.replace('/', '_'));

            await fs.promises.copyFile(sourcePath, backupPath);
        }
    }

    private async unifiedConfigExists(): Promise<boolean> {
        return await this.fileExists(this.configPath);
    }

    private async writeUnifiedConfig(config: any): Promise<void> {
        const yamlContent = yaml.dump(config, {
            indent: 2,
            lineWidth: -1,
            quotingType: '"',
            forceQuotes: false,
        });

        await fs.promises.writeFile(this.configPath, yamlContent, 'utf8');
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    private async loadConfigFile(filePath: string): Promise<any> {
        const content = await fs.promises.readFile(filePath, 'utf8');

        if (path.extname(filePath) === '.json') {
            return JSON.parse(content);
        } else {
            return yaml.load(content);
        }
    }

    private getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((current: any, key: string) => current?.[key], obj);
    }

    private isValidVersion(version: string): boolean {
        return /^\d+\.\d+\.\d+$/.test(version);
    }
}

export default ConfigMigrator;
