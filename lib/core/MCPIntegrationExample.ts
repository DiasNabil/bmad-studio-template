// Exemple d'intégration du système de sécurité MCP avec l'architecture BMAD existante
import { BMadError, ErrorSeverity } from './ErrorHandler';
import { Logger } from './Logger';
import { MCPSecurityManager, DEFAULT_SECURITY_CONFIGS } from './MCPSecurityManager';

/**
 * Classe d'exemple montrant comment intégrer la sécurité MCP
 * dans le workflow BMAD existant
 */
export class MCPIntegrationExample {
    private securityManager: MCPSecurityManager;
    private logger: Logger;

    constructor(environment: 'development' | 'staging' | 'production' = 'development') {
        this.logger = Logger.getInstance();

        // Initialiser le gestionnaire de sécurité MCP avec la config appropriée
        const config = DEFAULT_SECURITY_CONFIGS[environment];
        this.securityManager = MCPSecurityManager.getInstance(config);

        this.logger.warn('MCP Integration Example initialized', { environment });
    }

    /**
     * Exemple 1: Validation d'opération d'agent BMAD
     */
    public async validateBMADAgentOperation(): Promise<void> {
        try {
            // Simuler une opération d'agent BMAD
            const agentId = 'bmad-orchestrator';
            const operation = 'agent_coordination';
            const resource = 'project_initialization';

            this.logger.warn('Validating BMAD agent operation', { agentId, operation, resource });

            const result = await this.securityManager.validateMCPRequest(
                agentId,
                operation,
                resource,
                {
                    projectType: 'marketplace',
                    complexity: 'complex',
                    requestedBy: 'user@example.com',
                }
            );

            if (result.allowed) {
                this.logger.warn('✅ Agent operation validated successfully', {
                    agentId,
                    operation,
                });
                // Procéder avec l'opération...
                await this.simulateAgentWork(agentId, operation);
            } else {
                this.logger.error('❌ Agent operation blocked', {
                    agentId,
                    operation,
                    reason: result.reason,
                });
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Agent operation validation failed', { error: errorMessage });
        }
    }

    /**
     * Exemple 2: Validation d'opération de fichier
     */
    public async validateFileOperations(): Promise<void> {
        const fileOperations = [
            { agent: 'dev', operation: 'read', path: '/lib/core/ErrorHandler.ts' },
            { agent: 'dev', operation: 'write', path: '/lib/generators/ComponentGenerator.js' },
            { agent: 'qa', operation: 'create', path: '/tests/unit/new-test.spec.ts' },
            { agent: 'architect', operation: 'delete', path: '/temp/cache.tmp' },
        ] as const;

        for (const op of fileOperations) {
            try {
                const result = await this.securityManager.validateFileOperation(
                    op.agent,
                    op.operation,
                    op.path,
                    { requestTime: new Date().toISOString() }
                );

                if (result.allowed) {
                    this.logger.warn(`✅ File ${op.operation} allowed`, {
                        agent: op.agent,
                        path: op.path,
                    });
                } else {
                    this.logger.error(`❌ File ${op.operation} blocked`, {
                        agent: op.agent,
                        path: op.path,
                        reason: result.reason,
                    });
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error('File operation validation failed', {
                    operation: op,
                    error: errorMessage,
                });
            }
        }
    }

    /**
     * Exemple 3: Validation de commandes système
     */
    public async validateSystemCommands(): Promise<void> {
        const systemCommands = [
            { agent: 'devops', command: 'git', args: ['status'] },
            { agent: 'dev', command: 'npm', args: ['install', 'lodash'] },
            { agent: 'qa', command: 'npm', args: ['test'] },
            { agent: 'malicious-agent', command: 'rm', args: ['-rf', '/'] }, // Devrait être bloqué
            { agent: 'dev', command: 'curl', args: ['https://malicious.com'] }, // Devrait être bloqué
        ];

        for (const cmd of systemCommands) {
            try {
                const result = await this.securityManager.validateSystemCommand(
                    cmd.agent,
                    cmd.command,
                    cmd.args,
                    {
                        executionContext: 'ci/cd_pipeline',
                        timestamp: Date.now(),
                    }
                );

                if (result.allowed) {
                    this.logger.warn(`✅ Command allowed: ${cmd.command} ${cmd.args.join(' ')}`, {
                        agent: cmd.agent,
                    });
                } else {
                    this.logger.error(`❌ Command blocked: ${cmd.command} ${cmd.args.join(' ')}`, {
                        agent: cmd.agent,
                        reason: result.reason,
                    });
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error('System command validation failed', {
                    command: cmd,
                    error: errorMessage,
                });
            }
        }
    }

    /**
     * Exemple 4: Validation d'opérations réseau
     */
    public async validateNetworkOperations(): Promise<void> {
        const networkOperations = [
            { agent: 'marketplace-expert', operation: 'api_call', domain: 'api.stripe.com' },
            { agent: 'marketplace-expert', operation: 'webhook', domain: 'webhook.paypal.com' },
            { agent: 'data-insights', operation: 'analytics', domain: 'analytics.google.com' },
            { agent: 'dev', operation: 'fetch', domain: 'suspicious.com' }, // Devrait être bloqué
            { agent: 'unknown-agent', operation: 'request', domain: 'legitimate.com' }, // Agent non enregistré
        ];

        for (const netOp of networkOperations) {
            try {
                const result = await this.securityManager.validateNetworkOperation(
                    netOp.agent,
                    netOp.operation,
                    netOp.domain,
                    {
                        protocol: 'https',
                        method: 'GET',
                        userAgent: 'BMAD-Agent/1.0',
                    }
                );

                if (result.allowed) {
                    this.logger.warn(`✅ Network operation allowed to ${netOp.domain}`, {
                        agent: netOp.agent,
                        operation: netOp.operation,
                    });
                } else {
                    this.logger.error(`❌ Network operation blocked to ${netOp.domain}`, {
                        agent: netOp.agent,
                        operation: netOp.operation,
                        reason: result.reason,
                    });
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error('Network operation validation failed', {
                    operation: netOp,
                    error: errorMessage,
                });
            }
        }
    }

    /**
     * Exemple 5: Test de rate limiting
     */
    public async testRateLimiting(): Promise<void> {
        this.logger.warn('🚦 Testing rate limiting...');

        const agent = 'dev';
        const operation = 'code_generation';

        // Faire plusieurs requêtes rapidement pour déclencher le rate limiting
        for (let i = 1; i <= 15; i++) {
            try {
                const result = await this.securityManager.validateMCPRequest(
                    agent,
                    operation,
                    `request_${i}`,
                    { requestNumber: i }
                );

                if (result.allowed) {
                    this.logger.warn(`✅ Request ${i} allowed`);
                } else {
                    this.logger.error(`❌ Request ${i} rate limited: ${result.reason}`);
                }
            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Request ${i} failed`, { error: errorMessage });
            }

            // Petite pause entre les requêtes
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    /**
     * Exemple 6: Génération de rapport d'audit
     */
    public async generateSecurityReport(): Promise<void> {
        try {
            this.logger.warn('📊 Generating security report...');

            // Obtenir les statistiques actuelles
            const stats = this.securityManager.getSecurityStats();
            this.logger.warn('Security Statistics', {
                totalRequests: stats.totalRequests,
                blockedRequests: stats.blockedRequests,
                allowedRequests: stats.allowedRequests,
                errorCount: stats.errorCount,
                uptime: stats.uptime,
            });

            // Obtenir le statut de santé
            const health = this.securityManager.getHealthStatus();
            this.logger.warn('Security Health Status', {
                status: health.status,
                checksPassingCount: Object.values(health.checks).filter(Boolean).length,
                totalChecks: Object.keys(health.checks).length,
            });

            // Générer un rapport d'audit
            const report = await this.securityManager.generateAuditReport(
                new Date(Date.now() - 24 * 60 * 60 * 1000), // Dernières 24h
                new Date()
            );
            this.logger.warn('Audit Report', {
                totalRequests: report.summary.totalRequests,
                blockedRequests: report.summary.blockedRequests,
                commonViolations: report.commonViolationTypes,
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Failed to generate security report', { error: errorMessage });
        }
    }

    /**
     * Exécuter tous les exemples d'intégration
     */
    public async runAllExamples(): Promise<void> {
        this.logger.warn('🚀 Running MCP Security Integration Examples...');

        try {
            await this.validateBMADAgentOperation();
            await new Promise((resolve) => setTimeout(resolve, 500));

            await this.validateFileOperations();
            await new Promise((resolve) => setTimeout(resolve, 500));

            await this.validateSystemCommands();
            await new Promise((resolve) => setTimeout(resolve, 500));

            await this.validateNetworkOperations();
            await new Promise((resolve) => setTimeout(resolve, 500));

            await this.testRateLimiting();
            await new Promise((resolve) => setTimeout(resolve, 1000));

            await this.generateSecurityReport();

            this.logger.warn('✅ All MCP Security Integration Examples completed successfully!');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const integrationError = new BMadError('MCP Integration examples failed', {
                code: 'MCP_INTEGRATION_001',
                severity: ErrorSeverity.HIGH,
                context: { error: errorMessage },
            });

            this.logger.error(integrationError.message, integrationError.toJSON());
            throw integrationError;
        }
    }

    private async simulateAgentWork(agentId: string, operation: string): Promise<void> {
        // Simuler du travail d'agent
        this.logger.warn('🤖 Agent performing work...', { agentId, operation });

        // Simulation de tâches asynchrones
        await new Promise((resolve) => setTimeout(resolve, 200));

        this.logger.warn('✅ Agent work completed', { agentId, operation });
    }
}

/**
 * Fonction utilitaire pour exécuter l'exemple d'intégration
 */
export async function runMCPIntegrationDemo(
    environment: 'development' | 'staging' | 'production' = 'development'
): Promise<void> {
    const demo = new MCPIntegrationExample(environment);
    await demo.runAllExamples();
}

// Export pour utilisation en tant que script standalone
if (require.main === module) {
    runMCPIntegrationDemo('development').catch((error) => {
        console.error('Demo failed:', error);
        process.exit(1);
    });
}
