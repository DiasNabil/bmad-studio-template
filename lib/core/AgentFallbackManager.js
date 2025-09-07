/**
 * Gestionnaire de fallback pour les agents BMAD
 * Fournit des mécanismes robustes de gestion d'erreurs et d'alternatives
 */
class AgentFallbackManager {
  constructor() {
    this.fallbackStrategies = new Map();
    this.errorLogger = new ErrorTracker();
    this.setupDefaultFallbacks();
  }

  /**
   * Configure les stratégies de fallback par défaut
   */
  setupDefaultFallbacks() {
    // Mapping des agents alternatifs
    this.alternativeMapping = {
      'bmad-marketplace-architect': 'bmad-fullstack-architect',
      'bmad-cultural-expert': 'bmad-analyst',
      'bmad-payment-specialist': 'bmad-security-expert',
      'bmad-mobile-architect': 'bmad-fullstack-architect',
      'bmad-saas-architect': 'bmad-fullstack-architect',
      'bmad-enterprise-architect': 'bmad-fullstack-architect',
      'bmad-ecommerce-architect': 'bmad-fullstack-architect',
      'bmad-devops-engineer': 'bmad-backend-dev',
      'bmad-performance-expert': 'bmad-backend-dev',
      'bmad-integration-expert': 'bmad-backend-dev',
      'bmad-compliance-expert': 'bmad-security-expert'
    };

    // Capacités génériques par domaine
    this.genericCapabilities = {
      architecture: ['system_design', 'technical_planning'],
      development: ['coding', 'implementation'],
      security: ['basic_security', 'data_protection'],
      analysis: ['requirement_analysis', 'documentation'],
      testing: ['basic_testing', 'validation']
    };
  }

  /**
   * Gère l'indisponibilité d'un agent requis
   * @param {string} requiredAgent - Agent requis mais indisponible
   * @param {Object} context - Contexte du projet
   * @returns {Object} Résultat de la gestion de fallback
   */
  async handleAgentUnavailability(requiredAgent, context) {
    console.log(`⚠️  Agent indisponible: ${requiredAgent}`);
    
    const fallbackOptions = [
      () => this.findAlternativeAgent(requiredAgent),
      () => this.activateGenericAgent(requiredAgent, context),
      () => this.enablePartialFunctionality(requiredAgent, context),
      () => this.notifyManualIntervention(requiredAgent, context)
    ];

    for (const strategy of fallbackOptions) {
      try {
        const result = await strategy();
        if (result && result.success) {
          this.logFallbackSuccess(requiredAgent, result.agent || result.solution);
          return result;
        }
      } catch (error) {
        this.errorLogger.record(error, requiredAgent);
        console.warn(`Stratégie de fallback échouée pour ${requiredAgent}:`, error.message);
      }
    }

    return await this.escalateToManual(requiredAgent, context);
  }

  /**
   * Trouve un agent alternatif
   * @param {string} unavailableAgent - Agent indisponible
   * @returns {Object} Résultat avec agent alternatif
   */
  findAlternativeAgent(unavailableAgent) {
    const alternative = this.alternativeMapping[unavailableAgent];
    
    if (alternative) {
      return {
        success: true,
        agent: alternative,
        type: 'alternative_agent',
        message: `Utilisation de ${alternative} comme alternative à ${unavailableAgent}`,
        capabilities: this.getAgentCapabilities(alternative),
        limitations: this.getCapabilityDifferences(unavailableAgent, alternative)
      };
    }

    return { success: false, reason: 'Aucune alternative directe disponible' };
  }

  /**
   * Active un agent générique avec capacités limitées
   * @param {string} unavailableAgent - Agent spécialisé indisponible
   * @param {Object} context - Contexte du projet
   * @returns {Object} Configuration d'agent générique
   */
  activateGenericAgent(unavailableAgent, context) {
    const agentDomain = this.detectAgentDomain(unavailableAgent);
    const genericCapabilities = this.genericCapabilities[agentDomain];

    if (genericCapabilities) {
      const genericAgentName = `bmad-generic-${agentDomain}`;
      
      return {
        success: true,
        agent: genericAgentName,
        type: 'generic_agent',
        message: `Activation d'un agent générique pour ${agentDomain}`,
        capabilities: genericCapabilities,
        limitations: [
          'Fonctionnalités réduites par rapport à l\'agent spécialisé',
          'Peut nécessiter une intervention manuelle pour les tâches avancées',
          'Performance potentiellement dégradée'
        ]
      };
    }

    return { success: false, reason: 'Impossible de déterminer le domaine de l\'agent' };
  }

  /**
   * Active une fonctionnalité partielle
   * @param {string} unavailableAgent - Agent indisponible
   * @param {Object} context - Contexte du projet
   * @returns {Object} Configuration de fonctionnalité partielle
   */
  enablePartialFunctionality(unavailableAgent, context) {
    const partialFeatures = this.getPartialFeatures(unavailableAgent, context);
    
    if (partialFeatures.length > 0) {
      return {
        success: true,
        type: 'partial_functionality',
        message: `Activation de fonctionnalités partielles pour ${unavailableAgent}`,
        features: partialFeatures,
        limitations: [
          'Fonctionnalités limitées disponibles',
          'Supervision manuelle recommandée',
          'Possibilité de migration vers l\'agent complet plus tard'
        ]
      };
    }

    return { success: false, reason: 'Aucune fonctionnalité partielle disponible' };
  }

  /**
   * Notifie la nécessité d'une intervention manuelle
   * @param {string} unavailableAgent - Agent indisponible
   * @param {Object} context - Contexte du projet
   * @returns {Object} Plan d'intervention manuelle
   */
  notifyManualIntervention(unavailableAgent, context) {
    const interventionPlan = this.createInterventionPlan(unavailableAgent, context);
    
    return {
      success: true,
      type: 'manual_intervention',
      message: `Intervention manuelle requise pour remplacer ${unavailableAgent}`,
      plan: interventionPlan,
      urgency: this.assessUrgency(unavailableAgent, context),
      estimatedEffort: this.estimateManualEffort(unavailableAgent, context)
    };
  }

  /**
   * Escalade vers une gestion manuelle complète
   * @param {string} requiredAgent - Agent requis
   * @param {Object} context - Contexte du projet
   * @returns {Object} Plan d'escalade
   */
  async escalateToManual(requiredAgent, context) {
    console.error(`🚨 Escalade manuelle requise pour ${requiredAgent}`);
    
    return {
      success: false,
      type: 'manual_escalation',
      message: `Toutes les stratégies de fallback ont échoué pour ${requiredAgent}`,
      requiredActions: [
        `Installer ou configurer manuellement l'agent ${requiredAgent}`,
        'Vérifier les dépendances système',
        'Contacter le support technique si nécessaire',
        'Considérer une architecture alternative'
      ],
      impact: this.assessImpact(requiredAgent, context),
      timeline: 'Immédiat - bloque la progression'
    };
  }

  /**
   * Détecte le domaine d'un agent à partir de son nom
   * @param {string} agentName - Nom de l'agent
   * @returns {string} Domaine détecté
   */
  detectAgentDomain(agentName) {
    if (agentName.includes('architect')) return 'architecture';
    if (agentName.includes('dev') || agentName.includes('developer')) return 'development';
    if (agentName.includes('security')) return 'security';
    if (agentName.includes('analyst') || agentName.includes('expert')) return 'analysis';
    if (agentName.includes('qa') || agentName.includes('test')) return 'testing';
    
    return 'general';
  }

  /**
   * Récupère les capacités d'un agent
   * @param {string} agentName - Nom de l'agent
   * @returns {Array} Liste des capacités
   */
  getAgentCapabilities(agentName) {
    const capabilityMap = {
      'bmad-fullstack-architect': ['system_design', 'frontend_development', 'backend_development'],
      'bmad-analyst': ['requirement_analysis', 'documentation', 'research'],
      'bmad-security-expert': ['security_audit', 'compliance', 'data_protection'],
      'bmad-backend-dev': ['backend_development', 'api_design', 'database_design'],
      'bmad-ui-designer': ['ui_design', 'user_experience', 'prototyping']
    };

    return capabilityMap[agentName] || ['general_support'];
  }

  /**
   * Calcule les différences de capacités entre deux agents
   * @param {string} originalAgent - Agent original
   * @param {string} alternativeAgent - Agent alternatif
   * @returns {Array} Liste des limitations
   */
  getCapabilityDifferences(originalAgent, alternativeAgent) {
    const originalCaps = this.getAgentCapabilities(originalAgent);
    const alternativeCaps = this.getAgentCapabilities(alternativeAgent);
    
    const missing = originalCaps.filter(cap => !alternativeCaps.includes(cap));
    const extra = alternativeCaps.filter(cap => !originalCaps.includes(cap));
    
    const limitations = [];
    if (missing.length > 0) {
      limitations.push(`Capacités manquantes: ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
      limitations.push(`Capacités supplémentaires: ${extra.join(', ')}`);
    }
    
    return limitations;
  }

  /**
   * Récupère les fonctionnalités partielles disponibles
   * @param {string} agentName - Nom de l'agent
   * @param {Object} context - Contexte du projet
   * @returns {Array} Liste des fonctionnalités partielles
   */
  getPartialFeatures(agentName, context) {
    const partialFeatureMap = {
      'bmad-marketplace-architect': [
        'basic_architecture_planning',
        'simple_vendor_integration',
        'standard_payment_flow'
      ],
      'bmad-cultural-expert': [
        'basic_localization',
        'standard_cultural_guidelines',
        'common_diaspora_patterns'
      ],
      'bmad-payment-specialist': [
        'standard_payment_gateway',
        'basic_compliance_check',
        'simple_transaction_flow'
      ]
    };

    return partialFeatureMap[agentName] || [];
  }

  /**
   * Crée un plan d'intervention manuelle
   * @param {string} agentName - Nom de l'agent
   * @param {Object} context - Contexte du projet
   * @returns {Object} Plan d'intervention
   */
  createInterventionPlan(agentName, context) {
    return {
      steps: [
        {
          phase: 'Analyse',
          description: `Analyser les besoins spécifiques couverts par ${agentName}`,
          estimatedTime: '2-4 heures',
          priority: 'high'
        },
        {
          phase: 'Recherche',
          description: 'Identifier des solutions alternatives ou des experts externes',
          estimatedTime: '4-8 heures',
          priority: 'medium'
        },
        {
          phase: 'Implémentation',
          description: 'Mettre en place la solution alternative',
          estimatedTime: '1-3 jours',
          priority: 'high'
        },
        {
          phase: 'Validation',
          description: 'Tester et valider la solution de remplacement',
          estimatedTime: '4-8 heures',
          priority: 'medium'
        }
      ],
      resources: [
        'Documentation technique de l\'agent manquant',
        'Expertise externe si nécessaire',
        'Outils de développement appropriés'
      ],
      risks: [
        'Délai de livraison impacté',
        'Qualité potentiellement réduite',
        'Coûts supplémentaires possibles'
      ]
    };
  }

  /**
   * Évalue l'urgence d'une intervention
   * @param {string} agentName - Nom de l'agent
   * @param {Object} context - Contexte du projet
   * @returns {string} Niveau d'urgence
   */
  assessUrgency(agentName, context) {
    const criticalAgents = [
      'bmad-marketplace-architect',
      'bmad-security-expert',
      'bmad-payment-specialist'
    ];

    if (criticalAgents.includes(agentName)) {
      return 'high';
    }

    const projectComplexity = context.business?.complexity || 'moderate';
    if (projectComplexity === 'complex' || projectComplexity === 'very-complex') {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Estime l'effort requis pour une intervention manuelle
   * @param {string} agentName - Nom de l'agent
   * @param {Object} context - Contexte du projet
   * @returns {Object} Estimation de l'effort
   */
  estimateManualEffort(agentName, context) {
    const effortMap = {
      'bmad-marketplace-architect': { hours: '40-80', complexity: 'high' },
      'bmad-cultural-expert': { hours: '16-32', complexity: 'medium' },
      'bmad-payment-specialist': { hours: '24-48', complexity: 'high' },
      'bmad-security-expert': { hours: '32-64', complexity: 'high' },
      'bmad-fullstack-architect': { hours: '20-40', complexity: 'medium' }
    };

    return effortMap[agentName] || { hours: '8-16', complexity: 'low' };
  }

  /**
   * Évalue l'impact de l'absence d'un agent
   * @param {string} agentName - Nom de l'agent
   * @param {Object} context - Contexte du projet
   * @returns {Object} Évaluation de l'impact
   */
  assessImpact(agentName, context) {
    return {
      timeline: this.getTimelineImpact(agentName),
      quality: this.getQualityImpact(agentName),
      cost: this.getCostImpact(agentName),
      risk: this.getRiskImpact(agentName, context)
    };
  }

  getTimelineImpact(agentName) {
    const impactMap = {
      'bmad-marketplace-architect': 'Retard significatif (2-4 semaines)',
      'bmad-cultural-expert': 'Retard modéré (1-2 semaines)',
      'bmad-payment-specialist': 'Retard significatif (2-3 semaines)',
      'bmad-security-expert': 'Retard modéré (1-2 semaines)'
    };

    return impactMap[agentName] || 'Impact minimal sur le planning';
  }

  getQualityImpact(agentName) {
    const qualityMap = {
      'bmad-marketplace-architect': 'Impact majeur sur l\'architecture',
      'bmad-cultural-expert': 'Risque de problèmes culturels/UX',
      'bmad-payment-specialist': 'Risque de problèmes de paiement',
      'bmad-security-expert': 'Risque de vulnérabilités de sécurité'
    };

    return qualityMap[agentName] || 'Impact qualité limité';
  }

  getCostImpact(agentName) {
    return 'Coûts supplémentaires estimés: 15-30% du budget agent';
  }

  getRiskImpact(agentName, context) {
    const riskLevel = this.assessUrgency(agentName, context);
    const riskMap = {
      'high': 'Risque élevé d\'échec du projet',
      'medium': 'Risque modéré sur les objectifs',
      'low': 'Risque faible, alternatives disponibles'
    };

    return riskMap[riskLevel];
  }

  /**
   * Log le succès d'une stratégie de fallback
   * @param {string} originalAgent - Agent original
   * @param {string} solution - Solution mise en place
   */
  logFallbackSuccess(originalAgent, solution) {
    console.log(`✅ Fallback réussi pour ${originalAgent}:`);
    console.log(`   Solution: ${solution}`);
    
    // Enregistrer pour les métriques
    this.errorLogger.recordSuccess(originalAgent, solution);
  }
}

/**
 * Tracker d'erreurs pour les agents
 */
class ErrorTracker {
  constructor() {
    this.errors = new Map();
    this.successes = new Map();
  }

  /**
   * Enregistre une erreur
   * @param {Error} error - Erreur survenue
   * @param {string} agentName - Nom de l'agent concerné
   */
  record(error, agentName) {
    if (!this.errors.has(agentName)) {
      this.errors.set(agentName, []);
    }
    
    this.errors.get(agentName).push({
      error: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });

    console.error(`📝 Erreur enregistrée pour ${agentName}:`, error.message);
  }

  /**
   * Enregistre un succès de fallback
   * @param {string} agentName - Nom de l'agent original
   * @param {string} solution - Solution de fallback utilisée
   */
  recordSuccess(agentName, solution) {
    if (!this.successes.has(agentName)) {
      this.successes.set(agentName, []);
    }
    
    this.successes.get(agentName).push({
      solution: solution,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Récupère les statistiques d'erreurs
   * @returns {Object} Statistiques d'erreurs
   */
  getErrorStats() {
    const stats = {
      totalErrors: 0,
      agentErrors: {},
      successfulFallbacks: 0
    };

    for (const [agent, errors] of this.errors.entries()) {
      stats.agentErrors[agent] = errors.length;
      stats.totalErrors += errors.length;
    }

    for (const successes of this.successes.values()) {
      stats.successfulFallbacks += successes.length;
    }

    return stats;
  }
}

module.exports = { AgentFallbackManager };