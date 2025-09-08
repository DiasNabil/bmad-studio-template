# Module 7: Hooks (Intégrations & callbacks) - AMÉLIORÉ

## Objectif

Système de hooks robuste, sécurisé et performant pour extensibilité et intégrations dans l'écosystème BMAD/Contains.

## Améliorations par le Développeur BMAD

### Architecture du Système de Hooks et Callbacks

#### HookManager Enterprise avec Types Spécialisés

```javascript
class EnterpriseHookManager {
    constructor(security_context, performance_config) {
        this._hooks = {
            event_hooks: new Map(), // Déclencheurs événements système
            workflow_hooks: new Map(), // Intégrations workflows
            agent_hooks: new Map(), // Extensions agents BMAD
            custom_hooks: new Map(), // Extensibilité générique
            marketplace_hooks: new Map(), // Hooks spécifiques marketplace
        };

        this._security_context = security_context;
        this._performance_monitor = new HookPerformanceMonitor(performance_config);
        this._executor = new SecureHookExecutor();
        this._validator = new HookValidator();
    }

    async register_hook(hook_type, identifier, hook_function, options = {}) {
        // Validation sécurisée avant enregistrement
        const validation_result = await this._validator.validate_hook(
            hook_function,
            options.permissions || [],
            options.isolation_level || 'strict'
        );

        if (!validation_result.valid) {
            throw new HookValidationError(`Hook validation failed: ${validation_result.errors}`);
        }

        // Configuration performance et sécurité
        const hook_config = {
            function: hook_function,
            permissions: options.permissions || [],
            isolation_level: options.isolation_level || 'strict',
            timeout: options.timeout || 5000,
            retry_policy: options.retry_policy || 'exponential_backoff',
            performance_budget: options.performance_budget || 500, // ms
            dependencies: options.dependencies || [],
            priority: options.priority || 'normal',
        };

        // Enregistrement avec monitoring
        this._hooks.get(hook_type).set(identifier, hook_config);

        // Setup monitoring pour ce hook
        await this._performance_monitor.setup_hook_monitoring(identifier, hook_config);

        return { success: true, hook_id: identifier };
    }

    async trigger_hook(hook_type, context, options = {}) {
        const hooks = this._hooks.get(hook_type);
        if (!hooks || hooks.size === 0) {
            return { triggered: 0, results: [] };
        }

        const execution_results = [];
        const execution_options = {
            parallel: options.parallel !== false, // Défaut: parallèle
            fail_fast: options.fail_fast || false,
            timeout: options.timeout || 10000,
        };

        // Exécution selon priorité
        const prioritized_hooks = this._prioritize_hooks(Array.from(hooks.entries()));

        if (execution_options.parallel) {
            execution_results.push(
                ...(await this._execute_parallel(prioritized_hooks, context, execution_options))
            );
        } else {
            execution_results.push(
                ...(await this._execute_sequential(prioritized_hooks, context, execution_options))
            );
        }

        return {
            triggered: execution_results.length,
            results: execution_results,
            performance: await this._performance_monitor.get_execution_stats(hook_type),
        };
    }
}
```

### Exécution Sécurisée avec Sandbox et Isolation

#### Mécanismes de Sécurité Avancés

```javascript
class SecureHookExecutor {
    constructor() {
        this.sandbox_manager = new SandboxManager();
        this.permission_manager = new PermissionManager();
        this.resource_limiter = new ResourceLimiter();
    }

    async execute_with_security(hook_config, context, execution_id) {
        // Création sandbox isolé
        const sandbox = await this.sandbox_manager.create_sandbox({
            memory_limit: hook_config.memory_limit || '128MB',
            cpu_limit: hook_config.cpu_limit || '0.5',
            network_access: hook_config.network_access || 'restricted',
            file_system_access: hook_config.file_system_access || 'none',
        });

        try {
            // Validation des permissions en temps réel
            await this.permission_manager.validate_execution_permissions(
                hook_config.permissions,
                context,
                this._security_context
            );

            // Limitation des ressources
            await this.resource_limiter.apply_limits(execution_id, {
                max_memory: hook_config.memory_limit,
                max_cpu_time: hook_config.timeout,
                max_network_requests: hook_config.max_network_requests || 10,
            });

            // Exécution dans le sandbox
            const result = await sandbox.execute_with_timeout(
                hook_config.function,
                context,
                hook_config.timeout
            );

            // Validation du résultat
            await this._validate_hook_result(result, hook_config);

            return {
                success: true,
                result: result,
                execution_time: sandbox.get_execution_time(),
                resource_usage: sandbox.get_resource_usage(),
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                error_type: error.constructor.name,
                execution_time: sandbox.get_execution_time(),
                security_violation: error instanceof SecurityViolationError,
            };
        } finally {
            await sandbox.cleanup();
        }
    }

    async _validate_hook_result(result, hook_config) {
        // Validation du format de sortie
        if (hook_config.output_schema) {
            const validation = await this._validate_against_schema(
                result,
                hook_config.output_schema
            );
            if (!validation.valid) {
                throw new HookOutputValidationError(`Invalid output: ${validation.errors}`);
            }
        }

        // Vérification sécurité des données de sortie
        await this._scan_output_for_sensitive_data(result);
    }
}
```

### Hooks Spécialisés pour BMAD/Marketplace

#### Configuration Hooks Marketplace

```yaml
# marketplace-hooks-config.yaml
marketplace_hooks:
    payment_processing_hooks:
        pre_payment_validation:
            description: 'Validation pré-paiement avec contrôles culturels'
            trigger: 'before_payment_processing'
            agents: ['bmad-payment-specialist', 'bmad-cultural-expert']
            validation_rules:
                - currency_compliance: 'required'
                - cultural_payment_preferences: 'required'
                - fraud_detection_score: '>= 0.8'

            implementation: |
                async function prePaymentValidation(context) {
                  // Validation devise selon le pays
                  const currency_valid = await validateCurrencyCompliance(
                    context.payment.currency,
                    context.user.country,
                    context.cultural_profile
                  );
                  
                  // Vérification préférences culturelles
                  const cultural_check = await validateCulturalPaymentPreferences(
                    context.payment.method,
                    context.cultural_profile
                  );
                  
                  // Score de détection de fraude
                  const fraud_score = await calculateFraudScore(
                    context.payment,
                    context.user,
                    context.transaction_history
                  );
                  
                  return {
                    approved: currency_valid && cultural_check && fraud_score >= 0.8,
                    currency_valid,
                    cultural_check,
                    fraud_score,
                    recommendations: generatePaymentRecommendations(context)
                  };
                }

            performance_budget: 2000 # 2 seconds max
            retry_policy: 'linear_backoff'
            failure_action: 'block_payment'

        post_payment_success:
            description: 'Actions post-paiement réussi'
            trigger: 'after_payment_success'
            agents: ['bmad-logistics-expert', 'bmad-marketing-strategist']
            actions:
                - update_inventory
                - trigger_fulfillment
                - send_cultural_receipt
                - update_customer_profile

    vendor_management_hooks:
        vendor_onboarding_validation:
            description: 'Validation complète nouveau vendeur'
            trigger: 'vendor_registration_complete'
            agents: ['bmad-compliance', 'bmad-cultural-expert']
            validation_pipeline:
                - legal_document_verification
                - cultural_business_assessment
                - product_category_validation
                - financial_capability_check

            escalation_rules:
                - condition: 'validation_time > 48h'
                  action: 'notify_manager'
                - condition: 'cultural_score < 7'
                  action: 'require_cultural_training'

        product_cultural_review:
            description: 'Revue culturelle des produits'
            trigger: 'product_submission'
            agents: ['bmad-cultural-expert', 'bmad-content-creator']
            review_criteria:
                - cultural_sensitivity: 'required'
                - diaspora_relevance: 'required'
                - content_appropriateness: 'required'
                - market_fit_assessment: 'required'
```

### Performance et Gestion des Événements

#### Monitoring et Optimisation Performance

```javascript
class HookPerformanceMonitor {
    constructor(config) {
        this.metrics_collector = new MetricsCollector();
        this.alert_manager = new AlertManager(config.alerts);
        this.optimization_engine = new HookOptimizationEngine();
    }

    async monitor_hook_execution(hook_id, execution_context) {
        const start_time = performance.now();

        // Métriques en temps réel
        const metrics = {
            hook_id,
            start_time,
            execution_context: {
                trigger_type: execution_context.trigger_type,
                context_size: JSON.stringify(execution_context).length,
                agent_count: execution_context.involved_agents?.length || 0,
            },
        };

        // Monitoring durant l'exécution
        const monitoring_interval = setInterval(() => {
            this._collect_runtime_metrics(hook_id, metrics);
        }, 100);

        try {
            const result = await this._execute_monitored_hook(hook_id, execution_context);

            metrics.end_time = performance.now();
            metrics.execution_time = metrics.end_time - metrics.start_time;
            metrics.success = result.success;

            // Analyse performance
            await this._analyze_performance(hook_id, metrics, result);

            return result;
        } finally {
            clearInterval(monitoring_interval);
            await this.metrics_collector.record_execution(metrics);
        }
    }

    async _analyze_performance(hook_id, metrics, result) {
        // Détection des anomalies de performance
        if (metrics.execution_time > this.performance_thresholds[hook_id]?.warning) {
            await this.alert_manager.send_performance_alert({
                hook_id,
                execution_time: metrics.execution_time,
                threshold: this.performance_thresholds[hook_id].warning,
                severity:
                    metrics.execution_time > this.performance_thresholds[hook_id]?.critical
                        ? 'critical'
                        : 'warning',
            });
        }

        // Suggestions d'optimisation automatiques
        const optimization_suggestions = await this.optimization_engine.analyze(
            hook_id,
            metrics,
            result
        );
        if (optimization_suggestions.length > 0) {
            await this._apply_automatic_optimizations(hook_id, optimization_suggestions);
        }
    }
}
```

### API Développeur et Interface BMAD

#### Extension des Commandes BMAD pour Hooks

```javascript
// bmad-orchestrator hook extensions
const hookCommands = {
    '*hooks-list': async (type = 'all') => {
        const hooks = await this.hookManager.listHooks(type);
        return this.formatHooksList(hooks);
    },

    '*hook-status': async (hook_id) => {
        const status = await this.hookManager.getHookStatus(hook_id);
        return this.formatHookStatus(status);
    },

    '*hooks-performance': async (timeframe = '24h') => {
        const metrics = await this.performanceMonitor.getMetrics(timeframe);
        return this.formatPerformanceReport(metrics);
    },

    '*hook-test': async (hook_id, test_context = {}) => {
        const result = await this.hookManager.testHook(hook_id, test_context);
        return this.formatTestResult(result);
    },

    '*hooks-marketplace': async () => {
        const marketplaceHooks = await this.hookManager.getMarketplaceHooks();
        return this.formatMarketplaceHooks(marketplaceHooks);
    },
};

// Configuration hooks via YAML
const hookYAMLProcessor = {
    async loadHooksFromYAML(yamlPath) {
        const config = await YAML.load(fs.readFileSync(yamlPath, 'utf8'));

        for (const [hookType, hooks] of Object.entries(config)) {
            for (const [hookId, hookConfig] of Object.entries(hooks)) {
                await this.registerYAMLHook(hookType, hookId, hookConfig);
            }
        }
    },

    async registerYAMLHook(type, id, config) {
        // Conversion configuration YAML vers hook JavaScript
        const hookFunction = await this.compileHookFromYAML(config);

        await this.hookManager.register_hook(type, id, hookFunction, {
            permissions: config.permissions || [],
            timeout: config.performance_budget || 5000,
            isolation_level: config.isolation_level || 'strict',
            dependencies: config.dependencies || [],
            agents: config.agents || [],
        });
    },
};
```

### Tests et Debugging Avancés

#### Suite de Tests et Outils Debug

```javascript
class HookTestingSuite {
    constructor(hookManager) {
        this.hookManager = hookManager;
        this.mockContextGenerator = new MockContextGenerator();
        this.performanceProfiler = new HookPerformanceProfiler();
    }

    async runHookTests(hook_id, test_scenarios = []) {
        const results = [];

        for (const scenario of test_scenarios) {
            const test_result = await this.runSingleTest(hook_id, scenario);
            results.push(test_result);
        }

        return {
            hook_id,
            total_tests: test_scenarios.length,
            passed: results.filter((r) => r.passed).length,
            failed: results.filter((r) => !r.passed).length,
            results,
            performance_summary: this.generatePerformanceSummary(results),
        };
    }

    async runSingleTest(hook_id, scenario) {
        const test_context = await this.mockContextGenerator.generate(scenario);

        try {
            const start_time = performance.now();

            const result = await this.hookManager.trigger_hook(scenario.hook_type, test_context, {
                timeout: scenario.timeout || 5000,
            });

            const execution_time = performance.now() - start_time;

            // Validation du résultat selon le scénario
            const validation = await this.validateTestResult(result, scenario.expected);

            return {
                scenario: scenario.name,
                passed: validation.passed,
                execution_time,
                result,
                validation,
                performance_metrics: await this.performanceProfiler.getMetrics(hook_id),
            };
        } catch (error) {
            return {
                scenario: scenario.name,
                passed: false,
                error: error.message,
                stack_trace: error.stack,
            };
        }
    }
}

// Configuration de tests
const hookTestScenarios = {
    marketplace_payment_validation: [
        {
            name: 'valid_cultural_payment',
            hook_type: 'marketplace_hooks',
            context: {
                payment: { currency: 'KMF', amount: 1000, method: 'mobile_money' },
                user: { country: 'KM', cultural_profile: 'comorian_diaspora' },
                cultural_profile: { payment_preferences: ['mobile_money'], trust_level: 0.9 },
            },
            expected: { approved: true, cultural_check: true },
            timeout: 2000,
        },

        {
            name: 'invalid_currency_for_culture',
            hook_type: 'marketplace_hooks',
            context: {
                payment: { currency: 'USD', amount: 1000, method: 'credit_card' },
                user: { country: 'KM', cultural_profile: 'comorian_local' },
            },
            expected: { approved: false, currency_valid: false },
            timeout: 2000,
        },
    ],
};
```

## Intégration avec l'Écosystème BMAD

### Dépendances Respectées

- **Module 3 (PRD)** : Hooks générés automatiquement selon les user stories
- **Module 4 (Configuration agents)** : Hooks configurés selon les agents activés
- **Module 5 (Workflows)** : Intégration transparente avec les workflows multi-département

### Support Agents Contains Studio

- **Hook agents spécialisés** : Hooks dédiés pour chaque type d'agent
- **Context sharing** : Partage de contexte intelligent entre hooks et agents
- **Performance optimization** : Optimisation selon les patterns d'usage agents

## Contraintes Respectées

- **Performance** : Budget de performance < 500ms par hook
- **Sécurité** : Sandbox d'exécution et validation stricte
- **Compatibilité** : Intégration naturelle avec bmad-orchestrator
- **Extensibilité** : API claire pour développeurs tiers

## Résultats Attendus

- **Performance** : 95% des hooks < 500ms d'exécution
- **Sécurité** : 0 violation de sécurité en production
- **Fiabilité** : 99.5% de taux de succès d'exécution
- **Debugging** : Réduction 80% du temps de debug hooks
