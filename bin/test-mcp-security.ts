#!/usr/bin/env node
/* eslint-disable no-console */

// Script de test pour le système de sécurité MCP dans BMAD Studio Template
// Usage: npx ts-node bin/test-mcp-security.ts [environment]

import * as fs from 'fs/promises';
import * as path from 'path';

import { runMCPIntegrationDemo } from '../lib/core/MCPIntegrationExample';

// Configuration des chemins pour l'environnement de test
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Import dynamique pour éviter les erreurs de compilation
async function runMCPSecurityTest(): Promise<void> {
    try {
        console.log('🚀 Starting MCP Security System Test...');
        console.log(`📁 Project Root: ${PROJECT_ROOT}`);

        // Obtenir l'environnement depuis les arguments
        const environment =
            (process.argv[2] as 'development' | 'staging' | 'production') || 'development';
        console.log(`🌍 Environment: ${environment}`);

        // Vérifier que les fichiers de configuration existent
        const configPath = path.join(PROJECT_ROOT, 'configs', 'mcp', 'whitelist.yaml');
        const logsPath = path.join(PROJECT_ROOT, 'logs', 'mcp');

        try {
            await fs.access(configPath);
            console.log('✅ Configuration file found');
        } catch (error) {
            console.error('❌ Configuration file not found:', configPath);
            console.log('💡 Make sure configs/mcp/whitelist.yaml exists');
            process.exit(1);
        }

        try {
            await fs.access(logsPath);
            console.log('✅ Logs directory found');
        } catch (error) {
            console.log('📁 Creating logs directory...');
            await fs.mkdir(logsPath, { recursive: true });
            console.log('✅ Logs directory created');
        }

        console.log('🧪 Running MCP Integration Demo...');
        await runMCPIntegrationDemo(environment);

        console.log('');
        console.log('✅ MCP Security System Test completed successfully!');
        console.log('');
        console.log('📊 Check the following for results:');
        console.log(`   - Audit logs: ${logsPath}/audit.jsonl`);
        console.log(`   - Configuration: ${configPath}`);
        console.log('');
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ MCP Security System Test failed:');
        console.error(errorMessage);

        const nodeError = error as { code?: string };
        if (nodeError.code === 'MODULE_NOT_FOUND') {
            console.log('');
            console.log('💡 This might be because the TypeScript files need to be compiled.');
            console.log('   Try running: npm run build');
        }

        process.exit(1);
    }
}

// Fonction pour afficher l'aide
function showHelp(): void {
    console.log('');
    console.log('BMAD Studio Template - MCP Security System Test');
    console.log('');
    console.log('Usage:');
    console.log('  npx ts-node bin/test-mcp-security.ts [environment]');
    console.log('');
    console.log('Environments:');
    console.log('  development (default) - Relaxed security for development');
    console.log('  staging              - Standard security for staging');
    console.log('  production           - Strict security for production');
    console.log('');
    console.log('Examples:');
    console.log('  npx ts-node bin/test-mcp-security.ts');
    console.log('  npx ts-node bin/test-mcp-security.ts development');
    console.log('  npx ts-node bin/test-mcp-security.ts staging');
    console.log('  npx ts-node bin/test-mcp-security.ts production');
    console.log('');
}

// Vérifier les arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
    process.exit(0);
}

// Vérifier l'environnement
const validEnvironments = ['development', 'staging', 'production'];
const environment = process.argv[2] || 'development';

if (!validEnvironments.includes(environment)) {
    console.error(`❌ Invalid environment: ${environment}`);
    console.error(`Valid environments: ${validEnvironments.join(', ')}`);
    process.exit(1);
}

// Exécuter le test
runMCPSecurityTest().catch((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Script execution failed:', errorMessage);
    process.exit(1);
});
