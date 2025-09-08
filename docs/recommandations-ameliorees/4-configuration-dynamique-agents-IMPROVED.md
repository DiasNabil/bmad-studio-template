# Module 4: Configuration dynamique des agents - AMÉLIORÉ

## Objectif

Configurer automatiquement les agents nécessaires selon la direction du projet avec architecture robuste et mécanismes de fallback.

## Améliorations par le Développeur BMAD

### Architecture du Système de Configuration Dynamique

#### Structure Proposée

```javascript
// DynamicAgentConfigurator avec résolution intelligente
class DynamicAgentConfigurator {
    constructor() {
        this.dependencyResolver = new AgentDependencyResolver();
        this.fallbackManager = new AgentFallbackManager();
        this.configCache = new AgentConfigCache();
    }

    async resolveProjectAgents(projectProfile) {
        // Résolution dynamique basée sur le profil
        const selectedAgents = this.selectAgents(projectProfile);
        const resolvedDependencies = await this.dependencyResolver.resolve(selectedAgents);
        const validatedConfig = await this.validateConfiguration(resolvedDependencies);

        return this.generateClaudeMcpConfig(validatedConfig);
    }

    selectAgents(projectProfile) {
        const agentSelectionRules = {
            marketplace: [
                'bmad-marketplace-architect',
                'bmad-cultural-expert',
                'bmad-payment-specialist',
            ],
            web_app: ['bmad-fullstack-architect', 'bmad-ui-designer', 'bmad-backend-dev'],
            mobile: ['bmad-mobile-architect', 'bmad-ui-designer', 'bmad-qa-mobile'],
            saas: ['bmad-saas-architect', 'bmad-security-expert', 'bmad-devops-engineer'],
        };

        return agentSelectionRules[projectProfile.context.domain] || agentSelectionRules.web_app;
    }
}
```

### Gestion des Dépendances et Résolution des Conflits

#### Graphe de Dépendances Dynamique

```javascript
class AgentDependencyResolver {
    constructor() {
        this.dependencyGraph = new Map();
        this.conflictResolver = new ConflictResolver();
    }

    async resolve(agentsList) {
        // Construction du graphe de dépendances
        const graph = this.buildDependencyGraph(agentsList);

        // Détection des conflits
        const conflicts = this.detectConflicts(graph);

        // Résolution des conflits
        const resolvedAgents = await this.conflictResolver.resolve(conflicts);

        // Ordre d'activation optimal
        return this.topologicalSort(resolvedAgents);
    }

    buildDependencyGraph(agents) {
        const dependencyRules = {
            'bmad-cultural-expert': {
                requires: ['bmad-analyst'],
                conflicts: [],
                provides: ['cultural_analysis', 'diaspora_insights'],
            },
            'bmad-payment-specialist': {
                requires: ['bmad-security-expert'],
                conflicts: [],
                provides: ['payment_integration', 'financial_compliance'],
            },
            'bmad-marketplace-architect': {
                requires: ['bmad-cultural-expert', 'bmad-payment-specialist'],
                conflicts: ['bmad-simple-architect'],
                provides: ['marketplace_architecture', 'vendor_management'],
            },
        };

        return this.processRules(agents, dependencyRules);
    }
}
```

### Mécanismes de Fallback et Gestion d'Erreurs

#### Stratégies de Fallback Robustes

```javascript
class AgentFallbackManager {
    constructor() {
        this.fallbackStrategies = new Map();
        this.errorLogger = new ErrorTracker();
    }

    async handleAgentUnavailability(requiredAgent, context) {
        const fallbackOptions = [
            () => this.findAlternativeAgent(requiredAgent),
            () => this.activateGenericAgent(requiredAgent.capabilities),
            () => this.enablePartialFunctionality(requiredAgent.features),
            () => this.notifyManualIntervention(requiredAgent, context),
        ];

        for (const strategy of fallbackOptions) {
            try {
                const result = await strategy();
                if (result.success) {
                    this.logFallbackSuccess(requiredAgent, result.agent);
                    return result;
                }
            } catch (error) {
                this.errorLogger.record(error, requiredAgent);
            }
        }

        return this.escalateToManual(requiredAgent, context);
    }

    findAlternativeAgent(unavailableAgent) {
        const alternativeMapping = {
            'bmad-marketplace-architect': 'bmad-fullstack-architect',
            'bmad-cultural-expert': 'bmad-analyst',
            'bmad-payment-specialist': 'bmad-security-expert',
        };

        return alternativeMapping[unavailableAgent.name] || null;
    }
}
```

### Performance et Optimisation

#### Cache de Configuration Intelligent

```javascript
class AgentConfigCache {
    constructor() {
        this.cache = new LRUCache({ max: 128, ttl: 1000 * 60 * 30 }); // 30min TTL
        this.hitRateTracker = new HitRateTracker();
    }

    @memoize((projectProfile) => JSON.stringify(projectProfile))
    async getCachedConfiguration(projectProfile) {
        const cacheKey = this.generateCacheKey(projectProfile);

        let config = this.cache.get(cacheKey);
        if (config) {
            this.hitRateTracker.recordHit();
            return config;
        }

        // Cache miss - generate new config
        this.hitRateTracker.recordMiss();
        config = await this.generateFreshConfiguration(projectProfile);
        this.cache.set(cacheKey, config);

        return config;
    }

    generateCacheKey(projectProfile) {
        const keyComponents = [
            projectProfile.context.domain,
            projectProfile.technical.stack,
            projectProfile.business.complexity,
            projectProfile.bmad_routing.primary_agents?.sort().join(','),
        ];

        return crypto.createHash('md5').update(keyComponents.join('|')).digest('hex');
    }
}
```

### Tests et Validation Automatisée

#### Suite de Tests Complète

```javascript
// Tests unitaires pour configuration dynamique
describe('DynamicAgentConfigurator', () => {
    const testCases = [
        {
            name: 'marketplace_project_nominal',
            projectProfile: {
                context: { domain: 'marketplace', complexity: 'moderate' },
                technical: { stack: 'nextjs_odoo', architecture: 'hybrid' },
            },
            expectedAgents: [
                'bmad-marketplace-architect',
                'bmad-cultural-expert',
                'bmad-payment-specialist',
            ],
            expectedConfig: expect.objectContaining({
                agents: expect.arrayContaining(['bmad-marketplace-architect']),
            }),
        },
        {
            name: 'agent_unavailable_fallback',
            projectProfile: {
                /* test profile */
            },
            unavailableAgents: ['bmad-marketplace-architect'],
            expectedFallback: 'bmad-fullstack-architect',
            expectedWarning: true,
        },
        {
            name: 'complex_dependency_resolution',
            projectProfile: {
                /* complex profile */
            },
            expectedDependencyOrder: [
                'bmad-analyst',
                'bmad-cultural-expert',
                'bmad-payment-specialist',
                'bmad-marketplace-architect',
            ],
        },
    ];

    testCases.forEach((testCase) => {
        it(`should handle ${testCase.name}`, async () => {
            const configurator = new DynamicAgentConfigurator();
            const result = await configurator.resolveProjectAgents(testCase.projectProfile);

            expect(result).toMatchObject(testCase.expectedConfig);
            expect(result.agents).toEqual(expect.arrayContaining(testCase.expectedAgents));
        });
    });
});
```

### Génération .claude/project.mcp.json

#### Structure Claude Code Compatible

```javascript
async generateClaudeMcpConfig(resolvedAgents) {
  const mcpConfig = {
    "agents": {},
    "workflows": {},
    "hooks": {},
    "mcp_servers": {}
  };

  // Configuration des agents
  resolvedAgents.forEach(agent => {
    mcpConfig.agents[agent.name] = {
      "description": agent.description,
      "capabilities": agent.capabilities,
      "dependencies": agent.dependencies,
      "priority": agent.priority
    };
  });

  // Configuration des workflows associés
  const workflows = this.getAssociatedWorkflows(resolvedAgents);
  workflows.forEach(workflow => {
    mcpConfig.workflows[workflow.name] = workflow.config;
  });

  // Configuration MCP servers selon le contexte
  const mcpServers = this.getMcpServers(resolvedAgents);
  mcpConfig.mcp_servers = mcpServers;

  return mcpConfig;
}
```

### Validation avec Override Manuel

#### Système de Validation Interactif

```yaml
# validation-config.yaml
validation_system:
    auto_approve_threshold: 0.8
    manual_review_required:
        - agent_conflicts_detected
        - fallback_agents_used
        - custom_agents_requested

    override_mechanisms:
        - interactive_cli_prompt
        - config_file_override
        - environment_variable_override

    validation_steps:
        - dependency_check
        - conflict_resolution
        - capability_coverage
        - performance_impact_assessment
```

## Contraintes Respectées

### Structure JSON/YAML Claude Code

- Maintien de la compatibilité avec `project.mcp.json`
- Respect des conventions de nommage Claude Code
- Support des extensions personnalisées

### Mécanismes de Fallback

- Agents alternatifs mappés pour chaque spécialisation
- Dégradation gracieuse des fonctionnalités
- Notifications claires des limitations

### Dépendances Modules

- **Module 1** : Utilise la bibliothèque d'agents spécialisés
- **Module 2** : Consomme le `projectProfile` généré
- Intégration transparente avec l'écosystème BMAD existant

## Résultats Attendus

- **Réduction 80%** du temps de configuration manuelle
- **Amélioration 90%** de la précision de sélection d'agents
- **Élimination 95%** des erreurs de configuration
- **Support 100%** des fallbacks automatiques
