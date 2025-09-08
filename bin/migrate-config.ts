#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BMAD Configuration Migration Script
 * Migrates legacy configs to unified bmad-config.yaml
 */

import { ConfigMigrator } from '../lib/utils/ConfigMigrator';

async function main(): Promise<void> {
    console.log('🚀 BMAD Configuration Migration Tool');
    console.log('=====================================');

    const baseDir = process.cwd();
    const migrator = new ConfigMigrator(baseDir);

    try {
        console.log('📋 Starting configuration migration...');

        const result = await migrator.migrate();

        if (result.success) {
            console.log('✅ Migration completed successfully!');

            if (result.migratedFiles.length > 0) {
                console.log('\n📁 Migrated files:');
                result.migratedFiles.forEach((file) => {
                    console.log(`  - ${file}`);
                });
            }

            if (result.backupPath) {
                console.log(`\n💾 Backup created at: ${result.backupPath}`);
            }

            if (result.warnings.length > 0) {
                console.log('\n⚠️  Warnings:');
                result.warnings.forEach((warning) => {
                    console.log(`  - ${warning}`);
                });
            }

            console.log('\n🎉 Your BMAD configuration has been unified!');
            console.log('📄 New configuration file: bmad-config.yaml');
            console.log('\n📋 Next steps:');
            console.log('  1. Review the generated bmad-config.yaml');
            console.log('  2. Run tests to ensure compatibility');
            console.log('  3. Update your CI/CD pipeline if needed');
            console.log('  4. Remove legacy config files (backed up)');
        } else {
            console.error('❌ Migration failed!');

            if (result.errors.length > 0) {
                console.error('\n🚨 Errors:');
                result.errors.forEach((error) => {
                    console.error(`  - ${error}`);
                });
            }

            process.exit(1);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';

        console.error('💥 Migration crashed:', errorMessage);
        console.error('\n🔧 Debug information:');
        console.error(errorStack);
        process.exit(1);
    }
}

function showHelp(): void {
    console.log(
        [
            '',
            'BMAD Configuration Migration Tool',
            '',
            'Usage:',
            '  npx ts-node bin/migrate-config.ts [options]',
            '',
            'Options:',
            '  --help, -h     Show this help message',
            '  --dry-run      Show what would be migrated without making changes',
            '  --force        Force migration even if unified config exists',
            '',
            'Examples:',
            '  npx ts-node bin/migrate-config.ts',
            '  npx ts-node bin/migrate-config.ts --dry-run',
            '  npx ts-node bin/migrate-config.ts --force',
            '',
            'The tool automatically detects and migrates:',
            '  - .bmad-core/core-config.yaml',
            '  - .bmad-core/project-metadata.json',
            '  - configs/mcp/whitelist.yaml',
            '  - configs/agents/contains-registry.yaml',
            '  - configs/security/security-config.yaml',
            '  - configs/monitoring/prometheus-config.yaml',
            '',
        ].join('\n')
    );
}

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
}

// Run migration if this file is executed directly
if (require.main === module) {
    main().catch((error: Error) => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}
