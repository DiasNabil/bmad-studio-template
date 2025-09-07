/**
 * Résolveur de dépendances pour agents BMAD
 * Gère la résolution automatique des dépendances et détection des conflits
 */
class AgentDependencyResolver {
  constructor() {
    this.dependencyGraph = new Map();
    this.conflictResolver = new ConflictResolver();
    
    // Règles de dépendances des agents
    this.dependencyRules = {
      'bmad-cultural-expert': {
        requires: ['bmad-analyst'],
        conflicts: [],
        provides: ['cultural_analysis', 'diaspora_insights']
      },
      'bmad-payment-specialist': {
        requires: ['bmad-security-expert'],
        conflicts: [],
        provides: ['payment_integration', 'financial_compliance']
      },
      'bmad-marketplace-architect': {
        requires: ['bmad-cultural-expert', 'bmad-payment-specialist'],
        conflicts: ['bmad-simple-architect'],
        provides: ['marketplace_architecture', 'vendor_management']
      },
      'bmad-fullstack-architect': {
        requires: [],
        conflicts: ['bmad-simple-architect'],
        provides: ['fullstack_development', 'system_design']
      },
      'bmad-mobile-architect': {
        requires: ['bmad-ui-designer'],
        conflicts: [],
        provides: ['mobile_architecture', 'mobile_development']
      },
      'bmad-saas-architect': {
        requires: ['bmad-security-expert'],
        conflicts: [],
        provides: ['saas_architecture', 'multi_tenancy']
      },
      'bmad-enterprise-architect': {
        requires: ['bmad-integration-expert', 'bmad-compliance-expert'],
        conflicts: [],
        provides: ['enterprise_architecture', 'system_integration']
      },
      'bmad-ecommerce-architect': {
        requires: ['bmad-payment-specialist'],
        conflicts: [],
        provides: ['ecommerce_architecture', 'sales_optimization']
      }
    };
  }

  /**
   * Résout les dépendances pour une liste d'agents
   * @param {Array} agentsList - Liste des agents à résoudre
   * @returns {Array} Liste des agents avec dépendances résolues
   */
  async resolve(agentsList) {
    try {
      console.log('🔍 Résolution des dépendances d\'agents...');
      
      // Construction du graphe de dépendances
      const graph = this.buildDependencyGraph(agentsList);
      
      // Détection des conflits
      const conflicts = this.detectConflicts(graph);
      
      // Résolution des conflits
      const resolvedAgents = await this.conflictResolver.resolve(conflicts, graph);
      
      // Ordre d'activation optimal (tri topologique)
      const orderedAgents = this.topologicalSort(resolvedAgents);
      
      console.log(`✅ ${orderedAgents.length} agents résolus avec dépendances`);
      return orderedAgents;
      
    } catch (error) {
      console.error('❌ Erreur lors de la résolution des dépendances:', error.message);
      throw error;
    }
  }

  /**
   * Construit le graphe de dépendances
   * @param {Array} agents - Liste des agents
   * @returns {Map} Graphe de dépendances
   */
  buildDependencyGraph(agents) {
    const graph = new Map();
    const allAgents = new Set(agents);
    
    // Traitement récursif des dépendances
    const processAgent = (agentName) => {
      if (graph.has(agentName)) {
        return; // Déjà traité
      }
      
      const agentRule = this.dependencyRules[agentName];
      if (!agentRule) {
        // Agent sans règles définies - traitement minimal
        graph.set(agentName, {
          requires: [],
          conflicts: [],
          provides: [],
          processed: true
        });
        return;
      }
      
      // Ajouter les dépendances au set global
      for (const dependency of agentRule.requires) {
        allAgents.add(dependency);
        processAgent(dependency); // Récursion pour résoudre les sous-dépendances
      }
      
      graph.set(agentName, {
        requires: [...agentRule.requires],
        conflicts: [...agentRule.conflicts],
        provides: [...agentRule.provides],
        processed: true
      });
    };
    
    // Traiter tous les agents
    for (const agent of agents) {
      processAgent(agent);
    }
    
    return graph;
  }

  /**
   * Détecte les conflits entre agents
   * @param {Map} graph - Graphe de dépendances
   * @returns {Array} Liste des conflits détectés
   */
  detectConflicts(graph) {
    const conflicts = [];
    const activeAgents = Array.from(graph.keys());
    
    for (const [agentName, agentData] of graph.entries()) {
      for (const conflictAgent of agentData.conflicts) {
        if (activeAgents.includes(conflictAgent)) {
          conflicts.push({
            agent1: agentName,
            agent2: conflictAgent,
            type: 'direct_conflict',
            severity: 'high'
          });
        }
      }
      
      // Détection des conflits de capacités (agents qui fournissent les mêmes services)
      for (const [otherAgent, otherData] of graph.entries()) {
        if (agentName !== otherAgent) {
          const commonCapabilities = agentData.provides.filter(cap => 
            otherData.provides.includes(cap)
          );
          
          if (commonCapabilities.length > 0) {
            conflicts.push({
              agent1: agentName,
              agent2: otherAgent,
              type: 'capability_overlap',
              capabilities: commonCapabilities,
              severity: 'medium'
            });
          }
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Effectue un tri topologique pour déterminer l'ordre d'activation
   * @param {Map} resolvedAgents - Agents résolus
   * @returns {Array} Agents triés par ordre de dépendances
   */
  topologicalSort(resolvedAgents) {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();
    
    const visit = (agentName) => {
      if (visiting.has(agentName)) {
        throw new Error(`Dépendance circulaire détectée incluant ${agentName}`);
      }
      
      if (visited.has(agentName)) {
        return;
      }
      
      visiting.add(agentName);
      
      const agentData = resolvedAgents.get(agentName);
      if (agentData && agentData.requires) {
        for (const dependency of agentData.requires) {
          if (resolvedAgents.has(dependency)) {
            visit(dependency);
          }
        }
      }
      
      visiting.delete(agentName);
      visited.add(agentName);
      sorted.push(agentName);
    };
    
    // Visiter tous les agents
    for (const agentName of resolvedAgents.keys()) {
      if (!visited.has(agentName)) {
        visit(agentName);
      }
    }
    
    return sorted;
  }

  /**
   * Valide qu'un agent peut être ajouté sans créer de conflits
   * @param {string} agentName - Nom de l'agent à valider
   * @param {Array} existingAgents - Agents déjà présents
   * @returns {Object} Résultat de la validation
   */
  validateAgentAddition(agentName, existingAgents) {
    const validation = {
      valid: true,
      conflicts: [],
      missingDependencies: [],
      warnings: []
    };
    
    const agentRule = this.dependencyRules[agentName];
    if (!agentRule) {
      validation.warnings.push(`Pas de règles définies pour l'agent ${agentName}`);
      return validation;
    }
    
    // Vérifier les dépendances manquantes
    for (const dependency of agentRule.requires) {
      if (!existingAgents.includes(dependency)) {
        validation.missingDependencies.push(dependency);
        validation.valid = false;
      }
    }
    
    // Vérifier les conflits
    for (const conflictAgent of agentRule.conflicts) {
      if (existingAgents.includes(conflictAgent)) {
        validation.conflicts.push(conflictAgent);
        validation.valid = false;
      }
    }
    
    return validation;
  }

  /**
   * Suggère des agents pour combler les capacités manquantes
   * @param {Array} requiredCapabilities - Capacités requises
   * @param {Array} currentAgents - Agents actuels
   * @returns {Array} Suggestions d'agents
   */
  suggestAgentsForCapabilities(requiredCapabilities, currentAgents) {
    const suggestions = [];
    const currentCapabilities = this.getAvailableCapabilities(currentAgents);
    
    for (const capability of requiredCapabilities) {
      if (!currentCapabilities.includes(capability)) {
        // Trouver les agents qui fournissent cette capacité
        for (const [agentName, agentData] of Object.entries(this.dependencyRules)) {
          if (agentData.provides.includes(capability) && !currentAgents.includes(agentName)) {
            suggestions.push({
              agent: agentName,
              capability: capability,
              priority: this.getAgentPriority(agentName)
            });
          }
        }
      }
    }
    
    // Trier par priorité
    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Récupère les capacités disponibles pour une liste d'agents
   * @param {Array} agents - Liste des agents
   * @returns {Array} Capacités disponibles
   */
  getAvailableCapabilities(agents) {
    const capabilities = [];
    
    for (const agent of agents) {
      const agentRule = this.dependencyRules[agent];
      if (agentRule) {
        capabilities.push(...agentRule.provides);
      }
    }
    
    return [...new Set(capabilities)];
  }

  /**
   * Calcule la priorité d'un agent (simplifié)
   * @param {string} agentName - Nom de l'agent
   * @returns {number} Score de priorité
   */
  getAgentPriority(agentName) {
    const priorityMap = {
      'bmad-marketplace-architect': 10,
      'bmad-cultural-expert': 8,
      'bmad-payment-specialist': 9,
      'bmad-security-expert': 7,
      'bmad-fullstack-architect': 8,
      'bmad-analyst': 5
    };
    
    return priorityMap[agentName] || 5;
  }
}

/**
 * Résolveur de conflits entre agents
 */
class ConflictResolver {
  constructor() {
    this.resolutionStrategies = new Map();
    this.setupDefaultStrategies();
  }

  /**
   * Configure les stratégies de résolution par défaut
   */
  setupDefaultStrategies() {
    this.resolutionStrategies.set('direct_conflict', this.resolveDirectConflict.bind(this));
    this.resolutionStrategies.set('capability_overlap', this.resolveCapabilityOverlap.bind(this));
    this.resolutionStrategies.set('dependency_missing', this.resolveMissingDependency.bind(this));
  }

  /**
   * Résout une liste de conflits
   * @param {Array} conflicts - Conflits à résoudre
   * @param {Map} graph - Graphe de dépendances
   * @returns {Map} Graphe résolu
   */
  async resolve(conflicts, graph) {
    let resolvedGraph = new Map(graph);
    
    for (const conflict of conflicts) {
      const strategy = this.resolutionStrategies.get(conflict.type);
      if (strategy) {
        resolvedGraph = await strategy(conflict, resolvedGraph);
      } else {
        console.warn(`Pas de stratégie de résolution pour le conflit de type: ${conflict.type}`);
      }
    }
    
    return resolvedGraph;
  }

  /**
   * Résout un conflit direct entre deux agents
   * @param {Object} conflict - Description du conflit
   * @param {Map} graph - Graphe actuel
   * @returns {Map} Graphe modifié
   */
  async resolveDirectConflict(conflict, graph) {
    console.log(`⚠️  Conflit direct entre ${conflict.agent1} et ${conflict.agent2}`);
    
    // Stratégie simple: garder l'agent avec la priorité la plus élevée
    const resolver = new AgentDependencyResolver();
    const priority1 = resolver.getAgentPriority(conflict.agent1);
    const priority2 = resolver.getAgentPriority(conflict.agent2);
    
    const agentToRemove = priority1 > priority2 ? conflict.agent2 : conflict.agent1;
    const agentToKeep = priority1 > priority2 ? conflict.agent1 : conflict.agent2;
    
    console.log(`🔄 Résolution: suppression de ${agentToRemove}, conservation de ${agentToKeep}`);
    graph.delete(agentToRemove);
    
    return graph;
  }

  /**
   * Résout un conflit de chevauchement de capacités
   * @param {Object} conflict - Description du conflit
   * @param {Map} graph - Graphe actuel
   * @returns {Map} Graphe modifié
   */
  async resolveCapabilityOverlap(conflict, graph) {
    console.log(`ℹ️  Chevauchement de capacités entre ${conflict.agent1} et ${conflict.agent2}`);
    console.log(`   Capacités communes: ${conflict.capabilities.join(', ')}`);
    
    // Pour le chevauchement, on garde les deux agents mais on log l'information
    // L'utilisateur peut décider plus tard
    return graph;
  }

  /**
   * Résout une dépendance manquante
   * @param {Object} conflict - Description du conflit
   * @param {Map} graph - Graphe actuel
   * @returns {Map} Graphe modifié
   */
  async resolveMissingDependency(conflict, graph) {
    console.log(`🔗 Ajout de la dépendance manquante: ${conflict.dependency}`);
    
    // Ajouter la dépendance au graphe si elle n'est pas présente
    if (!graph.has(conflict.dependency)) {
      const resolver = new AgentDependencyResolver();
      const dependencyRule = resolver.dependencyRules[conflict.dependency];
      
      if (dependencyRule) {
        graph.set(conflict.dependency, dependencyRule);
      } else {
        // Créer une entrée minimale pour la dépendance inconnue
        graph.set(conflict.dependency, {
          requires: [],
          conflicts: [],
          provides: [],
          processed: true
        });
      }
    }
    
    return graph;
  }
}

module.exports = { AgentDependencyResolver };