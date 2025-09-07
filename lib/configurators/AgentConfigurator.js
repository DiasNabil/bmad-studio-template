class AgentConfigurator {
  constructor() {
    this.agentDependencyMap = {
      'marketplace': ['marketplace-expert', 'data-insights', 'payment-integrator'],
      'web-app': ['frontend-specialist', 'backend-architect'],
      'mobile': ['mobile-dev', 'performance-optimization'],
      'enterprise': ['devops', 'security', 'scalability-expert']
    };

    this.configurationCache = new Map();
  }

  async configure(analysis) {
    // Check cache first for existing configuration
    const cacheKey = this.generateCacheKey(analysis);
    if (this.configurationCache.has(cacheKey)) {
      return this.configurationCache.get(cacheKey);
    }

    // Core agents always included
    const coreAgents = [
      'bmad-orchestrator', 
      'architect', 
      'dev', 
      'qa', 
      'analyst'
    ];

    // Contextual agent selection
    const specializedAgents = this.selectSpecializedAgents(analysis);
    const workflows = this.selectWorkflows(analysis);
    
    const configuration = {
      selectedAgents: this.resolveAgentDependencies([...coreAgents, ...specializedAgents], analysis),
      workflows: workflows,
      configuration: this.generateAgentConfig(analysis)
    };

    // Cache the configuration
    this.configurationCache.set(cacheKey, configuration);

    return configuration;
  }

  resolveAgentDependencies(agents, analysis) {
    const projectType = this.detectProjectType(analysis);
    const dependencySet = new Set(agents);

    // Add type-specific dependencies
    if (this.agentDependencyMap[projectType]) {
      this.agentDependencyMap[projectType].forEach(agent => dependencySet.add(agent));
    }

    // Complex project dependency resolution
    if (analysis.complexity === 'very-complex') {
      dependencySet.add('architecture-advisor');
      dependencySet.add('performance-specialist');
    }

    // Security and compliance dependencies
    if (analysis.securityRequirements.compliance !== 'Basic') {
      dependencySet.add('security-architect');
      dependencySet.add('compliance-expert');
    }

    return Array.from(dependencySet);
  }

  selectSpecializedAgents(analysis) {
    const agents = [];
    
    const projectType = this.detectProjectType(analysis);
    
    // Cultural profile integration for marketplace
    if (projectType === 'marketplace') {
      agents.push('marketplace-cultural-expert');
      
      // Localization agents based on target markets
      if (analysis.targetMarkets && analysis.targetMarkets.length > 1) {
        agents.push('multi-market-strategist');
      }
    }
    
    // UX and Design
    if (analysis.stakeholders.includes('design-team')) {
      agents.push('ux-expert', 'design-system-architect');
    }
    
    // Product Management
    if (analysis.stakeholders.includes('product-team')) {
      agents.push('pm', 'product-strategy-consultant');
    }
    
    // DevOps and Infrastructure
    if (analysis.complexity === 'complex' || analysis.complexity === 'very-complex') {
      agents.push('devops', 'cloud-infrastructure-expert');
    }
    
    return agents;
  }

  selectWorkflows(analysis) {
    const workflows = [];
    
    const projectType = this.detectProjectType(analysis);
    
    switch(projectType) {
      case 'marketplace':
        workflows.push('marketplace-mvp-launch', 'seller-onboarding-workflow');
        break;
      case 'web-app':
        workflows.push('continuous-integration', 'agile-development');
        break;
      case 'mobile':
        workflows.push('mobile-first-development', 'cross-platform-optimization');
        break;
      case 'enterprise':
        workflows.push('enterprise-scale-deployment', 'multi-tenant-workflow');
        break;
      default:
        workflows.push('greenfield-fullstack');
    }
    
    // Always include enhanced validation
    workflows.push('enhanced-validation-workflow');
    
    return workflows;
  }

  generateAgentConfig(analysis) {
    const projectType = this.detectProjectType(analysis);

    return {
      project: {
        name: analysis.projectName,
        type: projectType,
        complexity: analysis.complexity,
        domain: analysis.domain || 'generic'
      },
      agents: {
        autoActivation: true,
        defaultAgent: 'bmad-orchestrator',
        fallbackMechanism: {
          enabled: true,
          strategyPriority: ['expertise', 'availability', 'performance']
        }
      },
      workflows: {
        defaultWorkflow: this.selectWorkflows(analysis)[0],
        parallelExecution: analysis.complexity === 'complex' || analysis.complexity === 'very-complex',
        adaptiveScaling: true
      },
      optimization: {
        cacheLifetime: 3600000, // 1 hour cache
        performanceThreshold: {
          complexity: {
            'simple': 0.7,
            'complex': 0.5,
            'very-complex': 0.3
          }
        }
      }
    };
  }

  detectProjectType(analysis) {
    const typeMap = {
      'ecommerce': 'marketplace',
      'saas': 'web-app',
      'mobile-app': 'mobile',
      'enterprise-solution': 'enterprise'
    };

    // Prioritize explicit project types
    for (const [key, value] of Object.entries(typeMap)) {
      if (analysis.projectTypes.includes(key)) {
        return value;
      }
    }

    // Fallback detection
    if (analysis.architectureType === 'microservices') return 'enterprise';
    if (analysis.domain === 'e-commerce') return 'marketplace';
    
    return 'web-app'; // Default fallback
  }

  generateCacheKey(analysis) {
    return JSON.stringify({
      projectName: analysis.projectName,
      projectTypes: analysis.projectTypes,
      complexity: analysis.complexity,
      domain: analysis.domain
    });
  }
}

module.exports = { AgentConfigurator };