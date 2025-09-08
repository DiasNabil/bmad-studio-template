#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * BMAD Configuration Validation Script
 * Validates unified bmad-config.yaml for correctness and compatibility
 */

import { ConfigValidator } from '../lib/utils/ConfigValidator';

async function main(): Promise<void> {
    console.log('🔍 BMAD Configuration Validator');
    console.log('===============================');

    const baseDir = process.cwd();
    const validator = new ConfigValidator(baseDir);

    try {
        console.log('📋 Validating bmad-config.yaml...');

        const result = await validator.validate();

        if (result.valid) {
            console.log('✅ Configuration is valid!');
            console.log(`📊 Quality Score: ${result.score}/100`);

            if (result.score >= 90) {
                console.log('🌟 Excellent configuration quality!');
            } else if (result.score >= 75) {
                console.log('👍 Good configuration quality');
            } else if (result.score >= 60) {
                console.log('⚠️  Fair configuration quality - consider improvements');
            } else {
                console.log('🔧 Configuration needs improvement');
            }
        } else {
            console.error('❌ Configuration validation failed!');
            console.error(`📊 Quality Score: ${result.score}/100`);
        }

        // Display errors
        if (result.errors.length > 0) {
            console.error('\n🚨 Errors found:');
            result.errors.forEach((error, index) => {
                console.error(
                    `  ${index + 1}. [${error.severity.toUpperCase()}] ${error.field}: ${error.message}`
                );
                console.error(`     Code: ${error.code}`);
            });
        }

        // Display warnings
        if (result.warnings.length > 0) {
            console.warn('\n⚠️  Warnings:');
            result.warnings.forEach((warning, index) => {
                console.warn(`  ${index + 1}. ${warning.field}: ${warning.message}`);
                console.warn(`     Suggestion: ${warning.suggestion}`);
                console.warn(`     Code: ${warning.code}`);
            });
        }

        // Summary and recommendations
        if (result.valid && result.warnings.length === 0) {
            console.log('\n🎉 Your configuration is perfect!');
        } else if (result.valid) {
            console.log('\n✨ Configuration is valid with some recommendations');
            console.log('📋 Consider addressing warnings to improve quality');
        } else {
            console.error('\n💥 Configuration has issues that need to be resolved');
            console.error('📋 Please fix the errors above and run validation again');
            process.exit(1);
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';

        console.error('💥 Validation crashed:', errorMessage);
        console.error('\n🔧 Debug information:');
        console.error(errorStack);
        process.exit(1);
    }
}

function showHelp(): void {
    console.log(
        [
            '',
            'BMAD Configuration Validator',
            '',
            'Usage:',
            '  npx ts-node bin/validate-config.ts [options]',
            '',
            'Options:',
            '  --help, -h     Show this help message',
            '  --verbose      Show detailed validation information',
            '  --json         Output results in JSON format',
            '',
            'Examples:',
            '  npx ts-node bin/validate-config.ts',
            '  npx ts-node bin/validate-config.ts --verbose',
            '  npx ts-node bin/validate-config.ts --json > validation-report.json',
            '',
            'The validator checks:',
            '  - Configuration structure and required fields',
            '  - Agent configurations and permissions',
            '  - Environment settings and security',
            '  - MCP security configuration',
            '  - Monitoring and alerting setup',
            '  - Compatibility with existing systems',
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

// Run validation if this file is executed directly
if (require.main === module) {
    main().catch((error: Error) => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}
