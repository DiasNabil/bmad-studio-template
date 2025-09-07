class AgentConfigurator {
  async configure(analysis) {
    const coreAgents = [
      'bmad-orchestrator',
      'architect',
      'dev',
      'qa',
      'analyst'
    ];

    const specializedAgents = this.selectSpecializedAgents(analysis);
    const workflows = this.selectWorkflows(analysis);
    
    return {
      selectedAgents: [...coreAgents, ...specializedAgents],
      workflows: workflows,
      configuration: this.generateAgentConfig(analysis)
    };
  }

  selectSpecializedAgents(analysis) {
    const agents = [];
    
    if (analysis.projectTypes.includes('ecommerce')) {
      agents.push('marketplace-expert');
    }
    
    if (analysis.stakeholders.includes('design-team')) {
      agents.push('ux-expert');
    }
    
    if (analysis.stakeholders.includes('product-team')) {
      agents.push('pm');
    }
    
    if (analysis.complexity === 'complex' || analysis.complexity === 'very-complex') {
      agents.push('devops');
    }
    
    if (analysis.securityRequirements.compliance !== 'Basic') {
      agents.push('security');
    }
    
    return agents;
  }

  selectWorkflows(analysis) {
    const workflows = [];
    
    if (analysis.projectTypes.includes('ecommerce')) {
      workflows.push('marketplace-mvp-launch');
    } else if (analysis.architectureType === 'microservices') {
      workflows.push('parallel-development');
    } else {
      workflows.push('greenfield-fullstack');
    }
    
    workflows.push('enhanced-validation-workflow');
    
    return workflows;
  }

  generateAgentConfig(analysis) {
    return {
      project: {
        name: analysis.projectName,
        type: analysis.projectTypes,
        complexity: analysis.complexity
      },
      agents: {
        autoActivation: true,
        defaultAgent: 'bmad-orchestrator'
      },
      workflows: {
        defaultWorkflow: this.selectWorkflows(analysis)[0],
        parallelExecution: analysis.complexity === 'complex'
      }
    };
  }
}

module.exports = { AgentConfigurator };