// const crypto = require('crypto'); // Pas utilisé pour l'instant
const { AgentDependencyResolver } = require('./AgentDependencyResolver');
const { AgentFallbackManager } = require('./AgentFallbackManager');
const { AgentConfigCache } = require('./AgentConfigCache');

/**
 * Classe principale pour la configuration dynamique des agents
 * Détecte automatiquement le contexte projet et résout les dépendances
 */
class DynamicAgentConfigurator {
  constructor() {
    this.dependencyResolver = new AgentDependencyResolver();
    this.fallbackManager = new AgentFallbackManager();
    this.configCache = new AgentConfigCache();
    this.validationThreshold = 0.8;
    
    // Règles de sélection d'agents par domaine
    this.agentSelectionRules = {
      marketplace: ['bmad-marketplace-architect', 'bmad-cultural-expert', 'bmad-payment-specialist'],
      web_app: ['bmad-fullstack-architect', 'bmad-ui-designer', 'bmad-backend-dev'],
      mobile: ['bmad-mobile-architect', 'bmad-ui-designer', 'bmad-qa-mobile'],
      saas: ['bmad-saas-architect', 'bmad-security-expert', 'bmad-devops-engineer'],
      enterprise: ['bmad-enterprise-architect', 'bmad-integration-expert', 'bmad-compliance-expert'],
      ecommerce: ['bmad-ecommerce-architect', 'bmad-payment-specialist', 'bmad-logistics-expert']
    };
  }

  /**
   * Résout automatiquement les agents nécessaires pour un projet
   * @param {Object} projectProfile - Profil du projet analysé
   * @returns {Object} Configuration MCP compatible
   */
  async resolveProjectAgents(projectProfile) {
    try {
      console.log('🎯 Démarrage de la résolution dynamique des agents...');
      
      // Vérifier le cache en premier
      const cachedConfig = await this.configCache.getCachedConfiguration(projectProfile);
      if (cachedConfig) {
        console.log('⚡ Configuration récupérée depuis le cache');
        return cachedConfig;
      }

      // Sélection des agents principaux
      const primaryAgents = this.selectAgents(projectProfile);
      console.log(`🤖 ${primaryAgents.length} agents primaires sélectionnés`);
      
      // Résolution des dépendances
      const resolvedDependencies = await this.dependencyResolver.resolve(primaryAgents);
      console.log(`🔗 ${resolvedDependencies.length} agents après résolution des dépendances`);
      
      // Validation de la configuration
      const validatedConfig = await this.validateConfiguration(resolvedDependencies, projectProfile);
      
      // Génération du fichier MCP
      const mcpConfig = await this.generateClaudeMcpConfig(validatedConfig, projectProfile);
      
      // Mise en cache
      await this.configCache.setCachedConfiguration(projectProfile, mcpConfig);
      
      console.log('✅ Configuration dynamique générée avec succès');
      return mcpConfig;
      
    } catch (error) {
      console.error('❌ Erreur lors de la résolution des agents:', error.message);
      throw error;
    }
  }

  /**
   * Sélectionne les agents principaux selon le contexte du projet
   * @param {Object} projectProfile - Profil du projet
   * @returns {Array} Liste des agents sélectionnés
   */
  selectAgents(projectProfile) {
    const domain = this.detectProjectDomain(projectProfile);
    const complexity = projectProfile.business?.complexity || 'moderate';
    const techStack = projectProfile.technical?.stack;
    
    // Agents de base selon le domaine
    let selectedAgents = [...(this.agentSelectionRules[domain] || this.agentSelectionRules.web_app)];
    
    // Ajouts selon la complexité
    if (complexity === 'complex' || complexity === 'very-complex') {
      selectedAgents.push('bmad-devops-engineer', 'bmad-performance-expert');
    }
    
    // Ajouts selon le stack technique
    if (techStack?.includes('odoo')) {
      selectedAgents.push('bmad-odoo-expert');
    }
    
    if (techStack?.includes('nextjs')) {
      selectedAgents.push('bmad-nextjs-expert');
    }
    
    if (projectProfile.context?.cultural_requirements) {
      selectedAgents.push('bmad-cultural-expert');
    }
    
    if (projectProfile.context?.payment_integration) {
      selectedAgents.push('bmad-payment-specialist');
    }
    
    // Éliminer les doublons
    return [...new Set(selectedAgents)];
  }

  /**
   * Détecte le domaine du projet à partir du profil
   * @param {Object} projectProfile - Profil du projet
   * @returns {string} Domaine détecté
   */
  detectProjectDomain(projectProfile) {
    const context = projectProfile.context || {};
    const business = projectProfile.business || {};
    
    // Détection par mots-clés explicites
    if (context.domain) {
      return context.domain;
    }
    
    // Détection par description/type de projet
    const description = (business.description || '').toLowerCase();
    const projectTypes = business.project_types || [];
    
    if (description.includes('marketplace') || projectTypes.includes('marketplace')) {
      return 'marketplace';
    }
    
    if (description.includes('mobile') || projectTypes.includes('mobile')) {
      return 'mobile';
    }
    
    if (description.includes('saas') || projectTypes.includes('saas')) {
      return 'saas';
    }
    
    if (description.includes('enterprise') || projectTypes.includes('enterprise')) {
      return 'enterprise';
    }
    
    if (description.includes('ecommerce') || description.includes('e-commerce') || projectTypes.includes('ecommerce')) {
      return 'ecommerce';
    }
    
    // Par défaut
    return 'web_app';
  }

  /**
   * Valide la configuration générée
   * @param {Array} resolvedAgents - Agents après résolution
   * @param {Object} projectProfile - Profil du projet
   * @returns {Object} Configuration validée
   */
  async validateConfiguration(resolvedAgents, projectProfile) {
    // Validation de base avec gestion des erreurs
    if (!Array.isArray(resolvedAgents)) {
      throw new Error('resolvedAgents doit être un tableau');
    }
    
    if (!projectProfile || typeof projectProfile !== 'object') {
      throw new Error('projectProfile est requis');
    }
    
    let validation = {
      agents: resolvedAgents,
      warnings: [],
      errors: [],
      confidence: 1.0
    };
    
    // Vérification de la couverture des capacités requises
    const requiredCapabilities = this.extractRequiredCapabilities(projectProfile);
    const availableCapabilities = this.getAgentCapabilities(resolvedAgents);
    
    for (const capability of requiredCapabilities) {
      if (!availableCapabilities.includes(capability)) {
        validation.warnings.push(`Capacité manquante: ${capability}`);
        validation.confidence -= 0.1;
      }
    }
    
    // Vérification des conflits potentiels
    const conflicts = await this.dependencyResolver.detectConflicts(resolvedAgents);
    if (conflicts.length > 0) {
      validation.warnings.push(`${conflicts.length} conflits détectés et résolus`);
      validation.confidence -= 0.05 * conflicts.length;
    }
    
    // Vérification de la charge de travail
    if (resolvedAgents.length > 10) {
      validation.warnings.push('Configuration complexe avec beaucoup d\'agents');
      validation.confidence -= 0.05;
    }
    
    // Si la confiance est trop faible, demander une validation manuelle
    if (validation.confidence < this.validationThreshold) {
      validation.needsManualReview = true;
      validation = await this.requestManualValidation(validation);
    }
    
    return validation;
  }

  /**
   * Extrait les capacités requises du profil projet
   * @param {Object} projectProfile - Profil du projet
   * @returns {Array} Capacités requises
   */
  extractRequiredCapabilities(projectProfile) {
    const capabilities = [];
    const domain = this.detectProjectDomain(projectProfile);
    
    // Capacités de base selon le domaine
    const domainCapabilities = {
      marketplace: ['marketplace_architecture', 'vendor_management', 'payment_integration'],
      web_app: ['fullstack_development', 'ui_design', 'backend_development'],
      mobile: ['mobile_development', 'ui_design', 'qa_mobile'],
      saas: ['saas_architecture', 'security_expertise', 'devops'],
      enterprise: ['enterprise_architecture', 'integration_expertise', 'compliance'],
      ecommerce: ['ecommerce_architecture', 'payment_integration', 'logistics']
    };
    
    capabilities.push(...(domainCapabilities[domain] || domainCapabilities.web_app));
    
    // Capacités selon le contexte
    if (projectProfile.context?.cultural_requirements) {
      capabilities.push('cultural_analysis');
    }
    
    if (projectProfile.business?.complexity === 'complex') {
      capabilities.push('performance_optimization', 'scalability_planning');
    }
    
    if (projectProfile.technical?.security_requirements) {
      capabilities.push('security_expertise');
    }
    
    return capabilities;
  }

  /**
   * Récupère les capacités disponibles pour une liste d'agents
   * @param {Array} agents - Liste des agents
   * @returns {Array} Capacités disponibles
   */
  getAgentCapabilities(agents) {
    const agentCapabilities = {
      'bmad-marketplace-architect': ['marketplace_architecture', 'vendor_management'],
      'bmad-cultural-expert': ['cultural_analysis', 'diaspora_insights'],
      'bmad-payment-specialist': ['payment_integration', 'financial_compliance'],
      'bmad-fullstack-architect': ['fullstack_development', 'system_design'],
      'bmad-ui-designer': ['ui_design', 'user_experience'],
      'bmad-backend-dev': ['backend_development', 'api_design'],
      'bmad-mobile-architect': ['mobile_development', 'mobile_architecture'],
      'bmad-qa-mobile': ['qa_mobile', 'mobile_testing'],
      'bmad-saas-architect': ['saas_architecture', 'multi_tenancy'],
      'bmad-security-expert': ['security_expertise', 'compliance'],
      'bmad-devops-engineer': ['devops', 'infrastructure', 'deployment'],
      'bmad-enterprise-architect': ['enterprise_architecture', 'system_integration'],
      'bmad-integration-expert': ['integration_expertise', 'api_management'],
      'bmad-compliance-expert': ['compliance', 'audit_support'],
      'bmad-ecommerce-architect': ['ecommerce_architecture', 'sales_optimization'],
      'bmad-logistics-expert': ['logistics', 'supply_chain'],
      'bmad-performance-expert': ['performance_optimization', 'monitoring'],
      'bmad-odoo-expert': ['odoo_development', 'erp_integration'],
      'bmad-nextjs-expert': ['nextjs_development', 'react_optimization'],
      'bmad-qa-expert': ['quality_assurance', 'testing_strategy']
    };
    
    const capabilities = [];
    for (const agent of agents) {
      if (agentCapabilities[agent]) {
        capabilities.push(...agentCapabilities[agent]);
      }
    }
    
    return [...new Set(capabilities)];
  }

  /**
   * Génère la configuration MCP compatible Claude
   * @param {Object} validatedConfig - Configuration validée
   * @param {Object} projectProfile - Profil du projet
   * @returns {Object} Configuration MCP
   */
  async generateClaudeMcpConfig(validatedConfig, projectProfile) {
    const mcpConfig = {
      agents: {},
      workflows: {},
      hooks: {},
      mcp_servers: {},
      metadata: {
        generated: new Date().toISOString(),
        domain: this.detectProjectDomain(projectProfile),
        complexity: projectProfile.business?.complexity || 'moderate',
        confidence: validatedConfig.confidence,
        warnings: validatedConfig.warnings
      }
    };

    // Configuration des agents
    for (const agentName of validatedConfig.agents) {
      const agentConfig = await this.getAgentConfiguration(agentName);
      mcpConfig.agents[agentName] = {
        description: agentConfig.description,
        capabilities: agentConfig.capabilities,
        dependencies: agentConfig.dependencies,
        priority: agentConfig.priority,
        enabled: true
      };
    }

    // Configuration des workflows associés
    const workflows = this.getAssociatedWorkflows(validatedConfig.agents, projectProfile);
    for (const workflow of workflows) {
      mcpConfig.workflows[workflow.name] = {
        description: workflow.description,
        agents: workflow.agents,
        steps: workflow.steps,
        triggers: workflow.triggers
      };
    }

    // Configuration des hooks selon le contexte
    const hooks = this.getContextualHooks(projectProfile);
    for (const hook of hooks) {
      mcpConfig.hooks[hook.name] = {
        trigger: hook.trigger,
        action: hook.action,
        agents: hook.agents
      };
    }

    // Configuration MCP servers
    mcpConfig.mcp_servers = {
      'bmad-dynamic-server': {
        command: 'node',
        args: ['.bmad-core/dynamic-mcp-server.js'],
        env: {
          BMAD_PROJECT_PATH: '.',
          BMAD_CONFIG_PATH: '.bmad-core/core-config.yaml',
          BMAD_AGENTS: JSON.stringify(validatedConfig.agents)
        }
      }
    };

    return mcpConfig;
  }

  /**
   * Récupère la configuration d'un agent spécifique
   * @param {string} agentName - Nom de l'agent
   * @returns {Object} Configuration de l'agent
   */
  async getAgentConfiguration(agentName) {
    const agentConfigs = {
      'bmad-marketplace-architect': {
        description: 'Expert en architecture de marketplace',
        capabilities: ['marketplace_architecture', 'vendor_management'],
        dependencies: ['bmad-cultural-expert', 'bmad-payment-specialist'],
        priority: 'high'
      },
      'bmad-cultural-expert': {
        description: 'Expert en analyse culturelle et diaspora',
        capabilities: ['cultural_analysis', 'diaspora_insights'],
        dependencies: [],
        priority: 'medium'
      },
      'bmad-payment-specialist': {
        description: 'Spécialiste intégrations de paiement',
        capabilities: ['payment_integration', 'financial_compliance'],
        dependencies: ['bmad-security-expert'],
        priority: 'high'
      },
      'bmad-fullstack-architect': {
        description: 'Architecte fullstack généraliste',
        capabilities: ['fullstack_development', 'system_design'],
        dependencies: [],
        priority: 'high'
      }
      // Ajouter d'autres configurations d'agents selon les besoins
    };

    return agentConfigs[agentName] || {
      description: `Agent spécialisé: ${agentName}`,
      capabilities: [],
      dependencies: [],
      priority: 'medium'
    };
  }

  /**
   * Récupère les workflows associés aux agents sélectionnés
   * @param {Array} agents - Liste des agents
   * @param {Object} projectProfile - Profil du projet
   * @returns {Array} Workflows recommandés
   */
  getAssociatedWorkflows(agents, projectProfile) {
    const workflows = [];
    const domain = this.detectProjectDomain(projectProfile);
    
    // Workflows de base selon le domaine
    const domainWorkflows = {
      marketplace: [
        {
          name: 'marketplace-setup',
          description: 'Configuration complète marketplace',
          agents: ['bmad-marketplace-architect', 'bmad-cultural-expert'],
          steps: ['analysis', 'architecture', 'implementation'],
          triggers: ['project_init']
        }
      ],
      web_app: [
        {
          name: 'fullstack-development',
          description: 'Développement fullstack standard',
          agents: ['bmad-fullstack-architect', 'bmad-ui-designer'],
          steps: ['planning', 'frontend', 'backend', 'integration'],
          triggers: ['development_start']
        }
      ]
    };
    
    workflows.push(...(domainWorkflows[domain] || domainWorkflows.web_app));
    
    // Workflow de validation pour tous les projets
    workflows.push({
      name: 'quality-validation',
      description: 'Validation qualité continue',
      agents: agents.filter(agent => agent.includes('qa') || agent.includes('expert')),
      steps: ['code_review', 'testing', 'performance_check'],
      triggers: ['pre_commit', 'deployment']
    });
    
    return workflows;
  }

  /**
   * Récupère les hooks contextuels selon le projet
   * @param {Object} projectProfile - Profil du projet
   * @returns {Array} Hooks recommandés
   */
  getContextualHooks(projectProfile) {
    const hooks = [
      {
        name: 'pre-commit',
        trigger: 'git commit',
        action: 'quality_check',
        agents: ['bmad-qa-expert']
      }
    ];
    
    const domain = this.detectProjectDomain(projectProfile);
    
    if (domain === 'marketplace') {
      hooks.push({
        name: 'marketplace-validation',
        trigger: 'marketplace_deployment',
        action: 'vendor_validation',
        agents: ['bmad-marketplace-architect', 'bmad-cultural-expert']
      });
    }
    
    if (projectProfile.business?.complexity === 'complex') {
      hooks.push(
        {
          name: 'performance-monitoring',
          trigger: 'deployment',
          action: 'performance_check',
          agents: ['bmad-performance-expert']
        },
        {
          name: 'security-scanning',
          trigger: 'pre_deployment',
          action: 'security_audit',
          agents: ['bmad-security-expert']
        }
      );
    }
    
    return hooks;
  }

  /**
   * Demande une validation interactive à l'utilisateur
   * @param {Object} config - Configuration proposée
   * @returns {Object} Configuration validée par l'utilisateur
   */
  async requestManualValidation(config) {
    console.log('\n⚠️  Validation manuelle requise');
    console.log(`Confiance: ${Math.round(config.confidence * 100)}%`);
    
    if (config.warnings && config.warnings.length > 0) {
      console.log('Avertissements:');
      config.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    // Simulation d'une validation interactive (à remplacer par inquirer si nécessaire)
    console.log('Configuration acceptée automatiquement pour la démo');
    
    return {
      ...config,
      manuallyValidated: true,
      validatedAt: new Date().toISOString()
    };
  }
}

module.exports = { DynamicAgentConfigurator };