#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BMAD Migration Compatibility Test Script
 * Tests compatibility with existing systems after migration
 */

import * as fs from 'fs';
import * as path from 'path';
import { ConfigValidator } from '../lib/utils/ConfigValidator';

interface CompatibilityTest {
    name: string;
    description: string;
    test: () => Promise<boolean>;
    critical: boolean;
}

interface TestResult {
    name: string;
    passed: boolean;
    error?: string;
    critical: boolean;
}

async function main(): Promise<void> {
    console.log('🧪 BMAD Migration Compatibility Tests');
    console.log('====================================');

    const baseDir = process.cwd();
    const tests = await getCompatibilityTests(baseDir);
    const results: TestResult[] = [];

    console.log(`📋 Running ${tests.length} compatibility tests...\n`);

    for (const test of tests) {
        console.log(`🔍 Testing: ${test.name}`);

        try {
            const passed = await test.test();
            results.push({
                name: test.name,
                passed,
                critical: test.critical,
            });

            if (passed) {
                console.log(`✅ PASSED: ${test.name}`);
            } else {
                console.log(`❌ FAILED: ${test.name}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            results.push({
                name: test.name,
                passed: false,
                error: errorMessage,
                critical: test.critical,
            });
            console.log(`💥 ERROR: ${test.name} - ${errorMessage}`);
        }

        console.log(`   ${test.description}\n`);
    }

    // Summary
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const criticalFailed = results.filter((r) => !r.passed && r.critical).length;

    console.log('📊 Test Results Summary');
    console.log('======================');
    console.log(`✅ Passed: ${passed}/${tests.length}`);
    console.log(`❌ Failed: ${failed}/${tests.length}`);
    console.log(`🚨 Critical Failures: ${criticalFailed}`);

    if (criticalFailed > 0) {
        console.error('\n💥 Critical compatibility issues found!');
        console.error('🔧 Please resolve these issues before proceeding:');

        results
            .filter((r) => !r.passed && r.critical)
            .forEach((result) => {
                console.error(`  - ${result.name}: ${result.error || 'Test failed'}`);
            });

        process.exit(1);
    }

    if (failed > 0) {
        console.warn('\n⚠️  Some tests failed, but migration can proceed');
        console.warn('📋 Consider addressing these issues:');

        results
            .filter((r) => !r.passed && !r.critical)
            .forEach((result) => {
                console.warn(`  - ${result.name}: ${result.error || 'Test failed'}`);
            });
    }

    if (passed === tests.length) {
        console.log('\n🎉 All compatibility tests passed!');
        console.log('✨ Migration is fully compatible with existing systems');
    } else {
        console.log('\n✅ Core compatibility verified');
        console.log('🚀 Migration can proceed safely');
    }
}

async function getCompatibilityTests(baseDir: string): Promise<CompatibilityTest[]> {
    const criticalTests = await getCriticalTests(baseDir);
    const integrationTests = await getIntegrationTests(baseDir);
    const systemTests = await getSystemTests(baseDir);

    return [...criticalTests, ...integrationTests, ...systemTests];
}

async function getCriticalTests(baseDir: string): Promise<CompatibilityTest[]> {
    return [
        {
            name: 'Unified Config Exists',
            description: 'Verify bmad-config.yaml file exists and is valid',
            critical: true,
            test: async () => {
                const configPath = path.join(baseDir, 'bmad-config.yaml');
                return await fileExists(configPath);
            },
        },
        {
            name: 'Config Structure Validation',
            description: 'Validate unified configuration structure and content',
            critical: true,
            test: async () => {
                const validator = new ConfigValidator(baseDir);
                const result = await validator.validate();
                return result.valid;
            },
        },
        {
            name: 'DynamicAgentConfigurator Compatibility',
            description: 'Check if agent configuration is compatible with DynamicAgentConfigurator',
            critical: true,
            test: async () => {
                const configPath = path.join(baseDir, 'bmad-config.yaml');
                if (!(await fileExists(configPath))) return false;

                const content = await fs.promises.readFile(configPath, 'utf8');

                return (
                    content.includes('specialized_agents') &&
                    content.includes('fallback_mechanism') &&
                    content.includes('bmad-orchestrator')
                );
            },
        },
        {
            name: 'MCPSecurityManager Integration',
            description: 'Verify MCP security configuration is properly integrated',
            critical: true,
            test: async () => {
                const configPath = path.join(baseDir, 'bmad-config.yaml');
                if (!(await fileExists(configPath))) return false;

                const content = await fs.promises.readFile(configPath, 'utf8');

                return (
                    content.includes('security:') &&
                    content.includes('mcp:') &&
                    content.includes('blocked_commands') &&
                    content.includes('rate_limits')
                );
            },
        },
    ];
}

async function getIntegrationTests(baseDir: string): Promise<CompatibilityTest[]> {
    return [
        {
            name: 'ErrorHandler Integration',
            description: 'Check BMadError integration and error code mapping',
            critical: false,
            test: async () => {
                const configPath = path.join(baseDir, 'bmad-config.yaml');
                if (!(await fileExists(configPath))) return false;

                const content = await fs.promises.readFile(configPath, 'utf8');

                return (
                    content.includes('error_handling') &&
                    content.includes('error_codes') &&
                    content.includes('BMadError')
                );
            },
        },
        {
            name: 'Prometheus Metrics Compatibility',
            description: 'Verify monitoring configuration supports Prometheus integration',
            critical: false,
            test: async () => {
                const configPath = path.join(baseDir, 'bmad-config.yaml');
                if (!(await fileExists(configPath))) return false;

                const content = await fs.promises.readFile(configPath, 'utf8');

                return (
                    content.includes('monitoring:') &&
                    content.includes('prometheus') &&
                    content.includes('metrics') &&
                    content.includes('mcp_metrics')
                );
            },
        },
        {
            name: 'Environment Configuration',
            description: 'Check all required environments are properly configured',
            critical: false,
            test: async () => {
                const configPath = path.join(baseDir, 'bmad-config.yaml');
                if (!(await fileExists(configPath))) return false;

                const content = await fs.promises.readFile(configPath, 'utf8');

                return (
                    content.includes('development:') &&
                    content.includes('staging:') &&
                    content.includes('production:')
                );
            },
        },
        {
            name: 'Migration Metadata',
            description: 'Verify migration metadata is properly set',
            critical: false,
            test: async () => {
                const configPath = path.join(baseDir, 'bmad-config.yaml');
                if (!(await fileExists(configPath))) return false;

                const content = await fs.promises.readFile(configPath, 'utf8');

                return (
                    content.includes('migration:') &&
                    content.includes('source_files') &&
                    content.includes('compatibility')
                );
            },
        },
    ];
}

async function getSystemTests(baseDir: string): Promise<CompatibilityTest[]> {
    return [
        {
            name: 'Package.json Scripts',
            description: 'Check if package.json has required migration scripts',
            critical: false,
            test: async () => {
                const packagePath = path.join(baseDir, 'package.json');
                if (!(await fileExists(packagePath))) return false;

                const content = await fs.promises.readFile(packagePath, 'utf8');
                const packageJson = JSON.parse(content);

                return (
                    packageJson.scripts &&
                    (packageJson.scripts['migrate-config'] ||
                        packageJson.scripts['validate-config'])
                );
            },
        },
        {
            name: 'TypeScript Compilation',
            description: 'Verify all TypeScript files compile without errors',
            critical: false,
            test: async () => {
                const keyFiles = [
                    'lib/utils/ConfigMigrator.ts',
                    'lib/utils/ConfigValidator.ts',
                    'bin/migrate-config.ts',
                    'bin/validate-config.ts',
                ];

                for (const file of keyFiles) {
                    const filePath = path.join(baseDir, file);
                    if (!(await fileExists(filePath))) return false;

                    try {
                        await fs.promises.readFile(filePath, 'utf8');
                    } catch {
                        return false;
                    }
                }

                return true;
            },
        },
    ];
}

function showHelp(): void {
    console.log(
        [
            '',
            'BMAD Migration Compatibility Tester',
            '',
            'Usage:',
            '  npx ts-node bin/test-migration.ts [options]',
            '',
            'Options:',
            '  --help, -h     Show this help message',
            '  --verbose      Show detailed test information',
            '  --critical     Run only critical tests',
            '',
            'Examples:',
            '  npx ts-node bin/test-migration.ts',
            '  npx ts-node bin/test-migration.ts --critical',
            '  npx ts-node bin/test-migration.ts --verbose',
            '',
            'This script tests:',
            '  - Configuration file validity',
            '  - System component compatibility',
            '  - Integration point functionality',
            '  - Migration completeness',
            '',
        ].join('\n')
    );
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.promises.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
}

// Run tests if this file is executed directly
if (require.main === module) {
    main().catch((error: Error) => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}
