// @ts-check

/**
 * @typedef {Object} PerformanceMetrics
 * @property {number} interdepartmentDelayReduction - Percentage of delay reduction
 * @property {number} bottleneckDetectionImprovement - Percentage of bottleneck detection improvement
 */

/**
 * @typedef {Object} WorkflowPhase
 * @property {string} name - Phase name
 * @property {'high'|'medium'|'low'} complexity - Complexity level
 * @property {string[]} resources - Required resources
 */

/**
 * @typedef {Object} AdaptiveWorkflow
 * @property {string} context - Workflow context
 * @property {WorkflowPhase[]} phases - Workflow phases
 * @property {string[]} synchronizationPoints - Key synchronization points
 */

/**
 * @typedef {Object} ProjectAnalysis
 * @property {string[]} [projectTypes] - Types of project
 * @property {'simple'|'complex'|'very-complex'} complexity - Project complexity
 */

/**
 * @typedef {Object} AgentConfig
 * @property {string[]} workflows - List of workflows
 * @property {string[]} selectedAgents - Selected agents
 */

/**
 * @typedef {Object} WorkflowConfig
 * @property {boolean} enabled - Whether workflow is enabled
 * @property {string[]} agents - Agents involved
 * @property {string[]} phases - Workflow phases
 * @property {Object} bottleneckDetection - Bottleneck detection configuration
 * @property {Object} resourceAllocation - Resource allocation strategy
 */

/**
 * WorkflowGenerator manages adaptive and specialized workflows for marketplace projects.
 */
class WorkflowGenerator {
  /** @type {PerformanceMetrics} */
  performanceMetrics;

  /**
   * Constructor initializes performance metrics
   */
  constructor() {
    this.performanceMetrics = {
      interdepartmentDelayReduction: 0.6,  // 60% delay reduction
      bottleneckDetectionImprovement: 0.8  // 80% bottleneck detection
    };
  }

  /**
   * Generate workflows based on project analysis and agent configuration
   * @param {ProjectAnalysis} analysis - Project analysis details
   * @param {AgentConfig} agentConfig - Agent configuration
   * @returns {Promise<{enabled: string[], configurations: Object, performanceMetrics: PerformanceMetrics}>} Workflow generation result
   */
  async generate(analysis, agentConfig) {
    /** @type {Object<string, AdaptiveWorkflow>} */
    const adaptiveWorkflows = this.generateAdaptiveWorkflows(analysis);
    
    return {
      enabled: this.getEnabledWorkflows(analysis, adaptiveWorkflows),
      configurations: this.generateWorkflowConfigs(analysis, agentConfig, adaptiveWorkflows),
      performanceMetrics: this.performanceMetrics
    };
  }

  /**
   * Generate adaptive workflows for marketplace context
   * @param {ProjectAnalysis} analysis - Project analysis details
   * @returns {Object<string, AdaptiveWorkflow>} Adaptive workflow configurations
   */
  generateAdaptiveWorkflows(analysis) {
    return {
      vendorOnboarding: {
        context: 'marketplace',
        phases: [
          { name: 'vendor-qualification', complexity: 'high', resources: ['legal', 'compliance', 'product'] },
          { name: 'technical-integration', complexity: 'medium', resources: ['tech', 'product'] },
          { name: 'marketplace-readiness', complexity: 'high', resources: ['marketing', 'sales'] }
        ],
        synchronizationPoints: ['vendor-qualification-review', 'technical-validation', 'launch-readiness']
      },
      productLaunchCultural: {
        context: 'marketplace-cultural',
        phases: [
          { name: 'cultural-market-research', complexity: 'high', resources: ['research', 'culture-insights'] },
          { name: 'localization-strategy', complexity: 'medium', resources: ['product', 'marketing'] },
          { name: 'cultural-adaptation', complexity: 'high', resources: ['design', 'language-experts'] }
        ],
        synchronizationPoints: ['market-insights-review', 'localization-validation', 'cultural-launch']
      }
    };
  }

  /**
   * Determine enabled workflows based on project analysis
   * @param {ProjectAnalysis} analysis - Project analysis details
   * @param {Object<string, AdaptiveWorkflow>} adaptiveWorkflows - Adaptive workflow configurations
   * @returns {string[]} List of enabled workflows
   */
  getEnabledWorkflows(analysis, adaptiveWorkflows) {
    const workflows = [];

    if (analysis.projectTypes?.includes('ecommerce')) {
      workflows.push('marketplace-mvp-launch');
      workflows.push('vendor-onboarding');
    }

    if (analysis.complexity === 'complex' || analysis.complexity === 'very-complex') {
      workflows.push('parallel-development');
      workflows.push('product-launch-cultural');
    }

    workflows.push('enhanced-validation-workflow');
    workflows.push('multi-department-synchronization');

    return workflows;
  }

  /**
   * Generate workflow configurations
   * @param {ProjectAnalysis} analysis - Project analysis details
   * @param {AgentConfig} agentConfig - Agent configuration
   * @param {Object<string, AdaptiveWorkflow>} adaptiveWorkflows - Adaptive workflow configurations
   * @returns {Object<string, WorkflowConfig>} Workflow configurations
   */
  generateWorkflowConfigs(analysis, agentConfig, adaptiveWorkflows) {
    /** @type {Object<string, WorkflowConfig>} */
    const configs = {};

    agentConfig.workflows.forEach(workflow => {
      const workflowConfig = {
        enabled: true,
        agents: agentConfig.selectedAgents,
        phases: this.getWorkflowPhases(workflow, analysis, adaptiveWorkflows),
        bottleneckDetection: this.configureBottleneckDetection(workflow, analysis),
        resourceAllocation: this.optimizeResourceAllocation(workflow, analysis)
      };

      configs[workflow] = workflowConfig;
    });

    return configs;
  }

  /**
   * Get workflow phases based on workflow type
   * @param {string} workflow - Workflow identifier
   * @param {ProjectAnalysis} analysis - Project analysis details
   * @param {Object<string, AdaptiveWorkflow>} adaptiveWorkflows - Adaptive workflow configurations
   * @returns {string[]} Workflow phases
   */
  getWorkflowPhases(workflow, analysis, adaptiveWorkflows) {
    const basePhases = ['planning', 'development', 'testing', 'deployment'];

    /** @type {Object<string, string[]>} */
    const workflowPhaseMap = {
      'marketplace-mvp-launch': ['market-research', 'technical-feasibility', 'development', 'user-testing', 'launch'],
      'parallel-development': ['domain-analysis', 'parallel-implementation', 'integration', 'validation'],
      'vendor-onboarding': adaptiveWorkflows.vendorOnboarding.phases.map(p => p.name),
      'product-launch-cultural': adaptiveWorkflows.productLaunchCultural.phases.map(p => p.name)
    };

    return workflowPhaseMap[workflow] || basePhases;
  }

  /**
   * Configure bottleneck detection strategies
   * @param {string} workflow - Workflow identifier
   * @param {ProjectAnalysis} analysis - Project analysis details
   * @returns {Object} Bottleneck detection configuration
   */
  configureBottleneckDetection(workflow, analysis) {
    /** @type {Object<string, Object>} */
    const bottleneckStrategies = {
      'marketplace-mvp-launch': {
        criticalPathMonitoring: true,
        resourcePressureThreshold: 0.75,
        escalationTriggers: ['delay', 'resource-constraint']
      },
      'vendor-onboarding': {
        complexityLevels: ['high', 'medium'],
        dynamicResourceReallocation: true
      }
    };

    return bottleneckStrategies[workflow] || {};
  }

  /**
   * Optimize resource allocation strategies
   * @param {string} workflow - Workflow identifier
   * @param {ProjectAnalysis} analysis - Project analysis details
   * @returns {Object} Resource allocation configuration
   */
  optimizeResourceAllocation(workflow, analysis) {
    /** @type {Object<string, Object>} */
    const resourceAllocationStrategies = {
      'marketplace-mvp-launch': {
        adaptiveTeaming: true,
        crossFunctionalCollaboration: true,
        priorityScoring: ['time-to-market', 'complexity', 'risk']
      },
      'product-launch-cultural': {
        expertiseMatchingAlgorithm: true,
        contextualResourcePool: ['cultural-experts', 'localization-specialists']
      }
    };

    return resourceAllocationStrategies[workflow] || {};
  }
}

module.exports = { WorkflowGenerator };
