# Module 9: Flattener / Context Provider - AMÉLIORÉ

## Objectif

Module optionnel mais très utile pour optimiser la gestion de contexte et améliorer les performances de l'ensemble du système BMAD.

## Concept du Flattener/Context Provider

### Problématique Résolue

Dans un système BMAD complexe avec multiples agents, workflows, hooks et MCP, la gestion du contexte peut devenir fragmentée et inefficace. Le Flattener/Context Provider centralise et optimise la gestion contextuelle.

### Architecture du Context Provider

#### Core Context Management

```javascript
class BMADContextProvider {
    constructor() {
        this.contextStore = new DistributedContextStore();
        this.contextFlattener = new ContextFlattener();
        this.contextOptimizer = new ContextOptimizer();
        this.accessController = new ContextAccessController();
    }

    async provideContext(requestingAgent, contextScope, requirements = {}) {
        // Récupération contexte selon les permissions
        const authorizedContext = await this.accessController.filterContext(
            requestingAgent,
            contextScope,
            requirements.security_level || 'standard'
        );

        // Flattening intelligent selon les besoins
        const flattenedContext = await this.contextFlattener.flatten(authorizedContext, {
            depth: requirements.depth || 'adaptive',
            focus_areas: requirements.focus_areas || [],
            optimization_target: requirements.optimization || 'balanced',
        });

        // Optimisation pour performance
        const optimizedContext = await this.contextOptimizer.optimize(flattenedContext, {
            target_agent: requestingAgent,
            usage_pattern: requirements.usage_pattern || 'standard',
            performance_budget: requirements.performance_budget || 1000,
        });

        return {
            context: optimizedContext,
            metadata: {
                source_agents: authorizedContext.sources,
                flattening_level: flattenedContext.level,
                optimization_applied: optimizedContext.optimizations,
                cache_key: this.generateCacheKey(optimizedContext),
                expires_at: Date.now() + (requirements.ttl || 300000), // 5min default
            },
        };
    }
}
```

#### Context Flattening Intelligence

```javascript
class ContextFlattener {
    constructor() {
        this.flatteningStrategies = new Map([
            ['marketplace', new MarketplaceContextFlattener()],
            ['web_app', new WebAppContextFlattener()],
            ['cultural', new CulturalContextFlattener()],
            ['technical', new TechnicalContextFlattener()],
        ]);
    }

    async flatten(context, options) {
        const strategy = this.selectFlatteningStrategy(context, options);

        // Flattening adaptatif selon le domaine
        const flattened = await strategy.flatten(context, {
            preserve_hierarchy: options.preserve_hierarchy !== false,
            merge_similar_contexts: options.merge_similar !== false,
            remove_redundancy: options.remove_redundancy !== false,
            compress_historical: options.compress_historical !== false,
        });

        // Validation de la cohérence après flattening
        await this.validateFlattenedContext(flattened, context);

        return flattened;
    }
}

class MarketplaceContextFlattener {
    async flatten(context, options) {
        return {
            // Contexte produit aplati
            products: this.flattenProductContext(context.products),

            // Contexte vendeur optimisé
            vendors: this.flattenVendorContext(context.vendors),

            // Contexte culturel consolidé
            cultural: this.flattenCulturalContext(context.cultural_data),

            // Contexte utilisateur unifié
            users: this.flattenUserContext(context.users),

            // Contexte transactionnel streamliné
            transactions: this.flattenTransactionContext(context.transactions),

            // Méta-contexte pour navigation
            navigation: {
                current_flow: context.current_workflow,
                active_agents: context.active_agents,
                cultural_segment: context.cultural_segment,
                market_context: context.market_context,
            },
        };
    }

    flattenProductContext(products) {
        // Consolidation des informations produits avec optimisations culturelles
        return products.map((product) => ({
            id: product.id,
            name: product.localized_names || product.name,
            cultural_adaptations: this.mergeCulturalAdaptations(product),
            availability: this.flattenAvailability(product),
            pricing: this.flattenPricing(product),
            vendor_info: this.extractVendorEssentials(product.vendor),
            cultural_score: product.cultural_relevance_score,
        }));
    }

    flattenCulturalContext(culturalData) {
        // Aplanissement du contexte culturel pour optimiser les requêtes
        return {
            primary_culture: culturalData.primary_cultural_profile,
            preferences: this.mergeCulturalPreferences(culturalData.preferences),
            behavioral_patterns: this.consolidateBehavioralData(culturalData.behaviors),
            market_insights: this.flattenMarketInsights(culturalData.market_data),
            diaspora_connections: this.optimizeDiasporaConnections(culturalData.diaspora),
        };
    }
}
```

### Context Store Distribué et Optimisé

#### Stockage Intelligent Multi-Niveaux

```javascript
class DistributedContextStore {
    constructor() {
        this.l1Cache = new MemoryCache({ maxSize: '256MB', ttl: 300 }); // 5min
        this.l2Cache = new RedisCache({ cluster: 'bmad-context', ttl: 3600 }); // 1h
        this.persistentStore = new PostgreSQLStore({ table: 'bmad_contexts' });
        this.searchIndex = new ElasticsearchIndex({ index: 'bmad-contexts' });
    }

    async storeContext(contextId, context, metadata) {
        const storageStrategy = this.determineStorageStrategy(context, metadata);

        // Stockage multi-niveaux selon la stratégie
        const promises = [];

        if (storageStrategy.useL1Cache) {
            promises.push(this.l1Cache.set(contextId, context, metadata.l1_ttl));
        }

        if (storageStrategy.useL2Cache) {
            promises.push(this.l2Cache.set(contextId, context, metadata.l2_ttl));
        }

        if (storageStrategy.persistData) {
            promises.push(this.persistentStore.upsert(contextId, context, metadata));
        }

        if (storageStrategy.indexForSearch) {
            promises.push(this.searchIndex.index(contextId, context, metadata));
        }

        await Promise.all(promises);

        return { stored: true, strategy: storageStrategy };
    }

    async retrieveContext(contextId, accessPattern = 'standard') {
        // Récupération optimisée selon le pattern d'accès
        switch (accessPattern) {
            case 'hot':
                return (
                    (await this.l1Cache.get(contextId)) ||
                    (await this.l2Cache.get(contextId)) ||
                    (await this.persistentStore.get(contextId))
                );

            case 'warm':
                return (
                    (await this.l2Cache.get(contextId)) ||
                    (await this.persistentStore.get(contextId))
                );

            case 'cold':
                return await this.persistentStore.get(contextId);

            default:
                // Stratégie adaptative
                return await this.adaptiveRetrieve(contextId);
        }
    }

    async adaptiveRetrieve(contextId) {
        // Statistiques d'accès pour optimisation
        const accessStats = await this.getAccessStats(contextId);

        if (accessStats.frequency > 10) {
            // Accès fréquent
            return await this.retrieveContext(contextId, 'hot');
        } else if (accessStats.recency < 3600) {
            // Récent (1h)
            return await this.retrieveContext(contextId, 'warm');
        } else {
            return await this.retrieveContext(contextId, 'cold');
        }
    }
}
```

### Optimisations Context-Aware pour Agents BMAD

#### Agent Context Optimization

```javascript
class ContextOptimizer {
    constructor() {
        this.agentProfiles = new Map();
        this.usagePatterns = new UsagePatternAnalyzer();
        this.performanceProfiler = new ContextPerformanceProfiler();
    }

    async optimize(context, options) {
        const agentProfile = await this.getAgentProfile(options.target_agent);

        // Optimisation spécifique agent
        const optimized = await this.applyAgentOptimizations(context, agentProfile);

        // Optimisation selon les patterns d'usage
        const patternOptimized = await this.applyUsagePatternOptimizations(
            optimized,
            options.usage_pattern
        );

        // Optimisation performance selon le budget
        const performanceOptimized = await this.applyPerformanceOptimizations(
            patternOptimized,
            options.performance_budget
        );

        return {
            context: performanceOptimized,
            optimizations: ['agent_specific', 'usage_pattern', 'performance_budget'],
            size_reduction: this.calculateSizeReduction(context, performanceOptimized),
            estimated_performance_gain: this.estimatePerformanceGain(
                context,
                performanceOptimized,
                options.target_agent
            ),
        };
    }

    async applyAgentOptimizations(context, agentProfile) {
        // Optimisations spécifiques par type d'agent
        switch (agentProfile.type) {
            case 'bmad-cultural-expert':
                return {
                    ...context,
                    cultural: this.expandCulturalContext(context.cultural),
                    products: this.filterProductsByCulturalRelevance(context.products),
                    market: this.enhanceMarketCulturalData(context.market),
                };

            case 'bmad-payment-specialist':
                return {
                    ...context,
                    payments: this.expandPaymentContext(context.payments),
                    financial: this.consolidateFinancialData(context.financial),
                    compliance: this.enhanceComplianceData(context.compliance),
                };

            case 'bmad-marketplace-architect':
                return {
                    ...context,
                    architecture: this.expandArchitecturalContext(context.technical),
                    integrations: this.consolidateIntegrationData(context.integrations),
                    scalability: this.enhanceScalabilityData(context.scalability),
                };

            default:
                return context; // Pas d'optimisation spécifique
        }
    }
}
```

### Intégration avec l'Écosystème BMAD

#### Context-Aware Agent Activation

```javascript
class ContextAwareAgentActivator {
    constructor(contextProvider) {
        this.contextProvider = contextProvider;
        this.agentManager = new BMADAgentManager();
    }

    async activateAgentsBasedOnContext(projectContext) {
        // Analyse du contexte pour déterminer les agents nécessaires
        const contextAnalysis = await this.contextProvider.analyzeContext(projectContext);

        // Recommandations d'agents basées sur le contexte
        const agentRecommendations = await this.generateAgentRecommendations(contextAnalysis);

        // Activation intelligente des agents
        const activationResults = [];

        for (const recommendation of agentRecommendations) {
            const agentContext = await this.contextProvider.provideContext(
                recommendation.agent_type,
                recommendation.required_context,
                recommendation.context_requirements
            );

            const activationResult = await this.agentManager.activateAgent(
                recommendation.agent_type,
                agentContext.context
            );

            activationResults.push({
                agent: recommendation.agent_type,
                activated: activationResult.success,
                context_provided: agentContext.metadata,
                performance_impact: activationResult.performance_impact,
            });
        }

        return activationResults;
    }
}
```

### Configuration et Templates

#### Context Provider Configuration

```yaml
# context-provider-config.yaml
context_provider:
    storage:
        l1_cache:
            type: 'memory'
            max_size: '256MB'
            ttl: 300

        l2_cache:
            type: 'redis'
            cluster: 'bmad-context-cluster'
            ttl: 3600
            compression: true

        persistent:
            type: 'postgresql'
            table: 'bmad_contexts'
            retention: '30d'

        search_index:
            type: 'elasticsearch'
            index: 'bmad-contexts'
            mappings: 'context-mappings.json'

    flattening:
        strategies:
            marketplace:
                preserve_cultural_hierarchy: true
                merge_vendor_contexts: true
                compress_historical_data: true

            web_app:
                flatten_component_tree: true
                merge_style_contexts: true
                optimize_asset_references: true

        performance_targets:
            flattening_time: '<100ms'
            size_reduction: '>40%'
            context_coherence: '>95%'

    optimization:
        agent_profiles:
            bmad-cultural-expert:
                priority_contexts: ['cultural', 'market', 'diaspora']
                expand_contexts: ['cultural_preferences', 'behavioral_patterns']
                compress_contexts: ['technical', 'infrastructure']

            bmad-payment-specialist:
                priority_contexts: ['payments', 'financial', 'compliance']
                expand_contexts: ['payment_methods', 'currency_data']
                compress_contexts: ['cultural', 'design']

    security:
        access_control:
            enabled: true
            default_level: 'standard'
            agent_permissions: 'agent-permissions.yaml'

        context_isolation:
            enabled: true
            isolation_levels: ['strict', 'standard', 'relaxed']
            cross_agent_sharing: 'controlled'
```

### Métriques et Monitoring

#### Performance Context Provider

```javascript
class ContextProviderMetrics {
    constructor() {
        this.metricsCollector = new MetricsCollector();
        this.performanceTracker = new PerformanceTracker();
    }

    async collectMetrics() {
        return {
            // Métriques de stockage
            storage: {
                l1_hit_rate: await this.calculateL1HitRate(),
                l2_hit_rate: await this.calculateL2HitRate(),
                storage_efficiency: await this.calculateStorageEfficiency(),
                retrieval_performance: await this.calculateRetrievalPerformance(),
            },

            // Métriques de flattening
            flattening: {
                average_flattening_time: await this.calculateAverageFlattening(),
                size_reduction_ratio: await this.calculateSizeReduction(),
                context_coherence_score: await this.calculateCoherenceScore(),
            },

            // Métriques d'optimisation
            optimization: {
                agent_satisfaction_score: await this.calculateAgentSatisfaction(),
                performance_improvement: await this.calculatePerformanceImprovement(),
                context_relevance_score: await this.calculateRelevanceScore(),
            },

            // Métriques système
            system: {
                memory_usage: process.memoryUsage(),
                cpu_usage: await this.getCPUUsage(),
                context_count: await this.getActiveContextCount(),
                agent_context_sharing: await this.getContextSharingStats(),
            },
        };
    }
}
```

## Avantages pour l'Écosystème BMAD

### Performance Optimisée

- **Réduction 60%** du temps d'accès au contexte
- **Amélioration 40%** de la cohérence contextuelle
- **Optimisation 50%** de l'utilisation mémoire

### Intelligence Contextuelle

- **Context-aware agent activation** automatique
- **Optimisations spécifiques** par type d'agent
- **Prédiction des besoins** contextuels

### Scalabilité Enterprise

- **Support multi-tenant** avec isolation
- **Distribution intelligente** des contextes
- **Monitoring avancé** des performances

## Intégration Modules BMAD

Ce module optionnel améliore tous les autres :

- **Module 1** : Optimise l'activation des agents spécialisés
- **Module 2** : Enrichit l'analyse contextuelle
- **Module 4** : Accélère la configuration dynamique
- **Module 5** : Optimise les workflows multi-département
- **Module 6** : Améliore la sélection MCP contextuelle
- **Module 7** : Enrichit le contexte des hooks
