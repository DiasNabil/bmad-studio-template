type ProjectComplexity = 'simple' | 'complex' | 'very-complex';
type ProjectType = 'marketplace' | 'web-app' | 'mobile' | 'enterprise';

interface WorkflowAnalysis {
  readonly projectType: ProjectType;
  readonly complexity: ProjectComplexity;
  readonly domain?: string;
  readonly stakeholders: ReadonlyArray<string>;
  readonly targetMarkets?: ReadonlyArray<string>;
}

interface WorkflowConfig {
  readonly name: string;
  readonly stages: ReadonlyArray<string>;
  readonly parallelTasks?: ReadonlyArray<string>;
  readonly dependencies?: ReadonlyArray<string>;
}

class WorkflowGenerator {
  private readonly workflowTemplates: Readonly<Record<string, WorkflowConfig>> = {
    'marketplace-mvp': {
      name: 'Marketplace MVP Launch',
      stages: [
        'market-research',
        'vendor-onboarding',
        'product-validation',
        'cultural-adaptation',
        'initial-launch',
        'feedback-collection'
      ],
      parallelTasks: ['vendor-screening', 'product-compliance-check'],
      dependencies: ['marketplace-cultural-expert']
    },
    'e-commerce-global': {
      name: 'Global E-Commerce Expansion',
      stages: [
        'market-analysis',
        'localization-strategy',
        'vendor-ecosystem-development',
        'multi-market-integration',
        'payment-gateway-setup',
        'compliance-verification'
      ],
      parallelTasks: [
        'regional-adaptation', 
        'payment-method-research',
        'cultural-sensitivity-audit'
      ],
      dependencies: [
        'multi-market-strategist', 
        'compliance-expert'
      ]
    }
  };

  /**
   * Generate workflow based on project analysis
   * @param analysis Detailed project analysis
   * @returns Configured workflow
   */
  public generateWorkflow(analysis: WorkflowAnalysis): WorkflowConfig {
    // Select base workflow template
    const baseTemplateKey = this.selectBaseWorkflow(analysis);
    const baseTemplate = this.workflowTemplates[baseTemplateKey];

    if (!baseTemplate) {
      throw new Error(`No workflow template found for key: ${baseTemplateKey}`);
    }
    
    // Customize workflow based on analysis
    return this.customizeWorkflow(baseTemplate, analysis);
  }

  /**
   * Select base workflow template
   * @param analysis Project analysis
   * @returns Workflow template key
   */
  private selectBaseWorkflow(analysis: WorkflowAnalysis): string {
    // Workflow selection logic
    switch (analysis.projectType) {
      case 'marketplace':
        return analysis.complexity === 'simple' 
          ? 'marketplace-mvp' 
          : 'e-commerce-global';
      case 'web-app':
        return 'marketplace-mvp'; // Default for web apps
      case 'mobile':
      case 'enterprise':
      default:
        return 'marketplace-mvp'; // Fallback
    }
  }

  /**
   * Customize workflow based on specific project requirements
   * @param baseTemplate Base workflow template
   * @param analysis Project analysis
   * @returns Customized workflow configuration
   */
  private customizeWorkflow(
    baseTemplate: WorkflowConfig, 
    analysis: WorkflowAnalysis
  ): WorkflowConfig {
    // Create a deep copy of the base template to avoid mutating the original
    const workflow: WorkflowConfig = {
      name: baseTemplate.name,
      stages: [...baseTemplate.stages],
      parallelTasks: baseTemplate.parallelTasks 
        ? [...baseTemplate.parallelTasks] 
        : undefined,
      dependencies: baseTemplate.dependencies 
        ? [...baseTemplate.dependencies] 
        : undefined
    };

    // Complexity-based customization
    if (analysis.complexity === 'complex') {
      workflow.stages = [
        ...workflow.stages, 
        'advanced-optimization'
      ];
      
      if (workflow.parallelTasks) {
        workflow.parallelTasks = [
          ...workflow.parallelTasks, 
          'performance-tuning'
        ];
      }
    }

    // Market-specific customization
    if (analysis.targetMarkets && analysis.targetMarkets.length > 1) {
      workflow.stages = [
        ...workflow.stages, 
        'multi-market-alignment'
      ];
    }

    // Stakeholder-specific additions
    if (analysis.stakeholders.includes('design-team')) {
      workflow.stages = [
        ...workflow.stages, 
        'ux-refinement'
      ];
    }

    return workflow;
  }

  /**
   * Validate workflow configuration
   * @param workflow Workflow to validate
   * @returns Boolean indicating workflow validity
   */
  public validateWorkflow(workflow: WorkflowConfig): boolean {
    return !!(
      workflow.name && 
      workflow.stages && 
      workflow.stages.length > 0
    );
  }
}

export default WorkflowGenerator;