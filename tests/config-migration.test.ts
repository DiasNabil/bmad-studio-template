/**
 * BMAD Configuration Migration Tests
 * Tests migration functionality and compatibility
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConfigMigrator } from '../lib/utils/ConfigMigrator';
import { ConfigValidator } from '../lib/utils/ConfigValidator';

describe('ConfigMigrator', () => {
    let tempDir: string;
    let migrator: ConfigMigrator;

    beforeEach(async () => {
        // Create temporary directory for testing
        tempDir = path.join(__dirname, 'temp', `test-${Date.now()}`);
        await fs.promises.mkdir(tempDir, { recursive: true });
        migrator = new ConfigMigrator(tempDir);
    });

    afterEach(async () => {
        // Clean up temporary directory
        if (await fileExists(tempDir)) {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
    });

    describe('Legacy Config Detection', () => {
        test('should detect existing core-config.yaml', async () => {
            // Create mock core-config.yaml
            const coreConfigPath = path.join(tempDir, '.bmad-core');
            await fs.promises.mkdir(coreConfigPath, { recursive: true });

            const mockConfig = {
                version: '2.2.0',
                metadata: {
                    name: 'test-project',
                    description: 'Test project',
                },
                project: {
                    type: 'template',
                    security_level: 'enterprise',
                },
            };

            await fs.promises.writeFile(
                path.join(coreConfigPath, 'core-config.yaml'),
                JSON.stringify(mockConfig),
                'utf8'
            );

            const result = await migrator.migrate();
            expect(result.migratedFiles).toContain('.bmad-core/core-config.yaml');
        });

        test('should detect MCP whitelist configuration', async () => {
            // Create mock MCP config
            const mcpConfigPath = path.join(tempDir, 'configs', 'mcp');
            await fs.promises.mkdir(mcpConfigPath, { recursive: true });

            const mockMCPConfig = {
                version: '1.0',
                global: {
                    rate_limits: {
                        requests_per_minute: 100,
                    },
                },
                agents: {
                    'bmad-orchestrator': {
                        permissions: {
                            level: 'admin',
                        },
                    },
                },
            };

            await fs.promises.writeFile(
                path.join(mcpConfigPath, 'whitelist.yaml'),
                JSON.stringify(mockMCPConfig),
                'utf8'
            );

            const result = await migrator.migrate();
            expect(result.migratedFiles).toContain('configs/mcp/whitelist.yaml');
        });

        test('should handle missing legacy configs gracefully', async () => {
            const result = await migrator.migrate();
            expect(result.success).toBe(true);
            expect(result.warnings).toContain('No legacy configuration files found');
        });
    });

    describe('Configuration Merging', () => {
        test('should merge core config with unified config', async () => {
            // Setup legacy config
            await createMockCoreConfig(tempDir);

            const result = await migrator.migrate();
            expect(result.success).toBe(true);

            // Check unified config exists and has merged data
            const unifiedConfigPath = path.join(tempDir, 'bmad-config.yaml');
            expect(await fileExists(unifiedConfigPath)).toBe(true);

            // Validate merged content (would need yaml parsing in real implementation)
            const content = await fs.promises.readFile(unifiedConfigPath, 'utf8');
            expect(content).toContain('test-project');
            expect(content).toContain('enterprise');
        });

        test('should preserve existing unified config data', async () => {
            // Create existing unified config
            const existingConfig = {
                version: '3.0.0',
                project: {
                    name: 'existing-project',
                    custom_field: 'preserved',
                },
            };

            await fs.promises.writeFile(
                path.join(tempDir, 'bmad-config.yaml'),
                JSON.stringify(existingConfig),
                'utf8'
            );

            // Add legacy config
            await createMockCoreConfig(tempDir);

            const result = await migrator.migrate();
            expect(result.success).toBe(true);
            expect(result.warnings).toContain(
                'bmad-config.yaml already exists, merging with legacy configs'
            );
        });
    });

    describe('Backup and Safety', () => {
        test('should create backup of original files', async () => {
            await createMockCoreConfig(tempDir);

            const result = await migrator.migrate();
            expect(result.success).toBe(true);
            expect(result.backupPath).toBeDefined();

            // Check backup exists
            const backupPath = result.backupPath!;
            expect(await fileExists(backupPath)).toBe(true);

            // Check original file is backed up
            const backupFile = path.join(backupPath, '.bmad-core_core-config.yaml');
            expect(await fileExists(backupFile)).toBe(true);
        });

        test('should handle migration errors gracefully', async () => {
            // Create invalid config that will cause parsing error
            const coreConfigPath = path.join(tempDir, '.bmad-core');
            await fs.promises.mkdir(coreConfigPath, { recursive: true });

            await fs.promises.writeFile(
                path.join(coreConfigPath, 'core-config.yaml'),
                'invalid: yaml: content: [}',
                'utf8'
            );

            const result = await migrator.migrate();
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('Migration Metadata', () => {
        test('should add migration metadata to unified config', async () => {
            await createMockCoreConfig(tempDir);

            const result = await migrator.migrate();
            expect(result.success).toBe(true);

            // Check migration metadata
            const configPath = path.join(tempDir, 'bmad-config.yaml');
            const content = await fs.promises.readFile(configPath, 'utf8');

            expect(content).toContain('migration:');
            expect(content).toContain('version: "1.0"');
            expect(content).toContain('source_files:');
            expect(content).toContain('.bmad-core/core-config.yaml');
        });
    });
});

describe('ConfigValidator', () => {
    let tempDir: string;
    let validator: ConfigValidator;

    beforeEach(async () => {
        tempDir = path.join(__dirname, 'temp', `validator-test-${Date.now()}`);
        await fs.promises.mkdir(tempDir, { recursive: true });
        validator = new ConfigValidator(tempDir);
    });

    afterEach(async () => {
        if (await fileExists(tempDir)) {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
    });

    describe('Configuration Validation', () => {
        test('should validate complete configuration', async () => {
            await createValidUnifiedConfig(tempDir);

            const result = await validator.validate();
            expect(result.valid).toBe(true);
            expect(result.score).toBeGreaterThan(80);
            expect(result.errors.length).toBe(0);
        });

        test('should detect missing required fields', async () => {
            // Create incomplete config
            const incompleteConfig = {
                version: '3.0.0',
                project: {
                    name: 'test-project',
                    // Missing required fields
                },
            };

            await fs.promises.writeFile(
                path.join(tempDir, 'bmad-config.yaml'),
                JSON.stringify(incompleteConfig),
                'utf8'
            );

            const result = await validator.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
        });

        test('should validate agent configurations', async () => {
            const configWithInvalidAgents = {
                version: '3.0.0',
                project: {
                    name: 'test-project',
                    type: 'template',
                    category: 'test',
                },
                security: { mcp: { enabled: true } },
                agents: {
                    specialized_agents: [
                        {
                            name: 'test-agent',
                            // Missing enabled field
                            priority: 'invalid-priority',
                        },
                    ],
                },
                environments: {},
                monitoring: {},
            };

            await fs.promises.writeFile(
                path.join(tempDir, 'bmad-config.yaml'),
                JSON.stringify(configWithInvalidAgents),
                'utf8'
            );

            const result = await validator.validate();
            expect(result.valid).toBe(false);
            expect(result.errors.some((e) => e.code === 'INVALID_AGENT_CONFIG')).toBe(true);
            expect(result.warnings.some((w) => w.code === 'UNKNOWN_PRIORITY_LEVEL')).toBe(true);
        });

        test('should calculate quality score correctly', async () => {
            const configWithWarnings = {
                version: '3.0.0',
                project: {
                    name: 'test-project',
                    type: 'unknown-type', // This will generate a warning
                    category: 'test',
                    security_level: 'unknown-level', // This will generate a warning
                },
                security: { mcp: { enabled: true } },
                agents: {
                    specialized_agents: [
                        {
                            name: 'bmad-orchestrator',
                            enabled: true,
                            priority: 'high',
                        },
                    ],
                },
                environments: {
                    development: { enabled: true },
                },
                monitoring: {},
            };

            await fs.promises.writeFile(
                path.join(tempDir, 'bmad-config.yaml'),
                JSON.stringify(configWithWarnings),
                'utf8'
            );

            const result = await validator.validate();
            expect(result.valid).toBe(true);
            expect(result.score).toBeLessThan(100); // Should be reduced due to warnings
            expect(result.warnings.length).toBeGreaterThan(0);
        });
    });

    describe('Security Validation', () => {
        test('should validate MCP security configuration', async () => {
            const configWithWeakSecurity = {
                version: '3.0.0',
                project: { name: 'test', type: 'template', category: 'test' },
                security: {
                    mcp: {
                        enabled: false, // This will generate a warning
                        global: {
                            rate_limits: {
                                requests_per_minute: 10000, // This will generate a warning
                            },
                        },
                        blocked_commands: [], // Missing critical commands
                    },
                },
                agents: { specialized_agents: [] },
                environments: {},
                monitoring: {},
            };

            await fs.promises.writeFile(
                path.join(tempDir, 'bmad-config.yaml'),
                JSON.stringify(configWithWeakSecurity),
                'utf8'
            );

            const result = await validator.validate();
            expect(result.warnings.some((w) => w.code === 'MCP_SECURITY_DISABLED')).toBe(true);
            expect(result.warnings.some((w) => w.code === 'HIGH_RATE_LIMIT')).toBe(true);
            expect(result.warnings.some((w) => w.code === 'CRITICAL_COMMAND_NOT_BLOCKED')).toBe(
                true
            );
        });
    });

    describe('Environment Validation', () => {
        test('should validate production environment safety', async () => {
            const unsafeProdConfig = {
                version: '3.0.0',
                project: { name: 'test', type: 'template', category: 'test' },
                security: { mcp: { enabled: true } },
                agents: { specialized_agents: [] },
                environments: {
                    production: {
                        enabled: true,
                        auto_deploy: true, // Unsafe for production
                        approval_required: false, // Unsafe for production
                    },
                },
                monitoring: {},
            };

            await fs.promises.writeFile(
                path.join(tempDir, 'bmad-config.yaml'),
                JSON.stringify(unsafeProdConfig),
                'utf8'
            );

            const result = await validator.validate();
            expect(result.warnings.some((w) => w.code === 'PROD_AUTO_DEPLOY_RISK')).toBe(true);
            expect(result.warnings.some((w) => w.code === 'PROD_NO_APPROVAL')).toBe(true);
        });
    });
});

// Helper functions
async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function createMockCoreConfig(baseDir: string): Promise<void> {
    const coreConfigPath = path.join(baseDir, '.bmad-core');
    await fs.promises.mkdir(coreConfigPath, { recursive: true });

    const mockConfig = {
        version: '2.2.0',
        metadata: {
            name: 'test-project',
            description: 'Test project for migration',
        },
        project: {
            type: 'template',
            category: 'test',
            security_level: 'enterprise',
        },
        environments: {
            development: { enabled: true },
            staging: { enabled: true },
            production: { enabled: true },
        },
        agents: {
            validation_required: true,
            fallback_enabled: true,
            specialized_agents: [{ name: 'bmad-orchestrator', enabled: true, priority: 'high' }],
        },
    };

    await fs.promises.writeFile(
        path.join(coreConfigPath, 'core-config.yaml'),
        JSON.stringify(mockConfig),
        'utf8'
    );
}

async function createValidUnifiedConfig(baseDir: string): Promise<void> {
    const validConfig = {
        version: '3.0.0',
        project: {
            name: 'test-project',
            description: 'Valid test project',
            type: 'template',
            category: 'test',
            security_level: 'enterprise',
        },
        security: {
            mcp: {
                enabled: true,
                global: {
                    rate_limits: {
                        requests_per_minute: 100,
                    },
                },
                blocked_commands: ['rm -rf', 'sudo', 'chmod 777'],
            },
        },
        agents: {
            specialized_agents: [
                {
                    name: 'bmad-orchestrator',
                    enabled: true,
                    priority: 'high',
                    permissions: {
                        level: 'admin',
                        rate_limits: {
                            requests_per_minute: 200,
                        },
                    },
                },
                {
                    name: 'bmad-architect',
                    enabled: true,
                    priority: 'high',
                },
                {
                    name: 'bmad-dev',
                    enabled: true,
                    priority: 'medium',
                },
                {
                    name: 'bmad-qa',
                    enabled: true,
                    priority: 'medium',
                },
            ],
        },
        environments: {
            development: {
                enabled: true,
                auto_deploy: true,
                security: 'standard',
            },
            staging: {
                enabled: true,
                auto_deploy: false,
                approval_required: true,
                security: 'enhanced',
            },
            production: {
                enabled: true,
                auto_deploy: false,
                approval_required: true,
                security: 'maximum',
            },
        },
        monitoring: {
            metrics: {
                enabled: true,
                provider: 'prometheus',
            },
            alerting: {
                enabled: true,
                channels: ['slack', 'email'],
            },
        },
        migration: {
            version: '1.0',
            source_files: ['.bmad-core/core-config.yaml'],
            validation_status: 'complete',
        },
    };

    await fs.promises.writeFile(
        path.join(baseDir, 'bmad-config.yaml'),
        JSON.stringify(validConfig, null, 2),
        'utf8'
    );
}
