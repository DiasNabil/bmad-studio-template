class WorkflowGenerator {
  async generate(analysis, agentConfig) {
    return {
      enabled: this.getEnabledWorkflows(analysis),
      configurations: this.generateWorkflowConfigs(analysis, agentConfig)
    };
  }

  getEnabledWorkflows(analysis) {
    const workflows = [];

    if (analysis.projectTypes.includes('ecommerce')) {
      workflows.push('marketplace-mvp-launch');
    }

    if (analysis.complexity === 'complex' || analysis.complexity === 'very-complex') {
      workflows.push('parallel-development');
    }

    workflows.push('enhanced-validation-workflow');

    return workflows;
  }

  generateWorkflowConfigs(analysis, agentConfig) {
    const configs = {};

    agentConfig.workflows.forEach(workflow => {
      configs[workflow] = {
        enabled: true,
        agents: agentConfig.selectedAgents,
        phases: this.getWorkflowPhases(workflow, analysis)
      };
    });

    return configs;
  }

  getWorkflowPhases(workflow, _analysis) {
    const basePhases = ['planning', 'development', 'testing', 'deployment'];

    if (workflow === 'marketplace-mvp-launch') {
      return ['market-research', 'technical-feasibility', 'development', 'user-testing', 'launch'];
    }

    if (workflow === 'parallel-development') {
      return ['domain-analysis', 'parallel-implementation', 'integration', 'validation'];
    }

    return basePhases;
  }
}

module.exports = { WorkflowGenerator };
