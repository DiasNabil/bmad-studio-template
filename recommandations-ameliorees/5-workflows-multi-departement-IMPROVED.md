# Module 5: Générateur de Workflows (agile multi-département) - AMÉLIORÉ

## Objectif
Activer des workflows pertinents selon les départements avec orchestration optimisée et gestion des bottlenecks.

## Améliorations par l'Optimisateur de Workflows

### Architecture Basée États/Transitions avec Synchronisation

#### Modèle de Workflow Intelligent
```javascript
class WorkflowOrchestrator {
  constructor() {
    this.stateMachine = new StateMachine();
    this.dependencyTracker = new DependencyTracker();
    this.bottleneckDetector = new BottleneckDetector();
    this.resourceAllocator = new ResourceAllocator();
  }

  async orchestrateWorkflow(workflowType, projectProfile) {
    const workflow = await this.loadWorkflowDefinition(workflowType);
    const optimizedFlow = await this.optimizeForProject(workflow, projectProfile);
    
    return this.executeWithMonitoring(optimizedFlow);
  }

  validateCrossDepartmentTransition(workflow, currentState, nextState) {
    const transition = this.getTransition(currentState, nextState);
    
    // Vérification des dépendances inter-département
    const dependencies = this.dependencyTracker.getDependencies(transition);
    const readyDepartments = dependencies.filter(dep => dep.isReady());
    
    if (readyDepartments.length !== dependencies.length) {
      return this.handleBlockedTransition(transition, dependencies);
    }
    
    return { approved: true, nextActions: this.getNextActions(nextState) };
  }
}
```

### Catalogue de Workflows Optimisés

#### Workflows Marketplace Spécialisés
```yaml
# marketplace-workflows.yaml
workflows:
  vendor_onboarding_flow:
    description: "Intégration complète nouveau vendeur"
    stages:
      - name: "legal_verification"
        department: "compliance"
        agents: ["bmad-compliance", "bmad-legal"]
        duration_estimate: "2-3 days"
        deliverables: ["legal_clearance", "tax_documentation"]
        
      - name: "cultural_assessment"
        department: "cultural"
        agents: ["bmad-cultural-expert", "bmad-market-analyst"]
        dependencies: ["legal_verification"]
        duration_estimate: "1-2 days"
        deliverables: ["cultural_profile", "market_positioning"]
        
      - name: "technical_integration"
        department: "tech"
        agents: ["bmad-integration-specialist", "bmad-qa-engineer"]
        dependencies: ["cultural_assessment"]
        duration_estimate: "3-5 days"
        deliverables: ["api_setup", "testing_complete"]
        
    sync_points:
      - name: "legal_compliance_gate"
        trigger: "legal_verification.completed"
        stakeholders: ["compliance", "cultural", "tech"]
        
      - name: "go_live_gate"
        trigger: "technical_integration.completed"
        stakeholders: ["all_departments", "vendor"]

  product_launch_diaspora_flow:
    description: "Lancement produit adapté communauté diaspora"
    stages:
      - name: "market_research"
        department: "analysis"
        agents: ["bmad-market-analyst", "bmad-cultural-expert"]
        parallel: true
        duration_estimate: "3-4 days"
        
      - name: "cultural_adaptation"
        department: "cultural"
        agents: ["bmad-cultural-expert", "bmad-content-creator"]
        dependencies: ["market_research"]
        duration_estimate: "2-3 days"
        
      - name: "marketing_campaign"
        department: "marketing"
        agents: ["bmad-marketing-strategist", "bmad-content-creator"]
        dependencies: ["cultural_adaptation"]
        parallel_with: ["technical_preparation"]
        duration_estimate: "4-5 days"
        
      - name: "technical_preparation"
        department: "tech"
        agents: ["bmad-dev", "bmad-qa-engineer"]
        dependencies: ["market_research"]
        duration_estimate: "5-7 days"
```

### Mécanismes de Détection et Prévention des Bottlenecks

#### Monitoring Temps Réel et Alerting
```javascript
class BottleneckDetector {
  constructor() {
    this.thresholds = {
      stage_duration_warning: 1.2, // 20% over estimate
      stage_duration_critical: 1.5, // 50% over estimate
      department_queue_warning: 5,
      department_queue_critical: 10
    };
    
    this.alertManager = new AlertManager();
  }

  async monitorWorkflowProgress(workflowInstance) {
    const metrics = await this.collectMetrics(workflowInstance);
    
    // Détection des retards
    const delays = this.detectDelays(metrics);
    if (delays.length > 0) {
      await this.handleDelays(delays, workflowInstance);
    }
    
    // Détection des engorgements
    const bottlenecks = this.detectQueueBottlenecks(metrics);
    if (bottlenecks.length > 0) {
      await this.triggerReallocation(bottlenecks, workflowInstance);
    }
    
    return this.generateHealthReport(metrics);
  }

  detectDelays(metrics) {
    return metrics.activeStages.filter(stage => {
      const progress = stage.actualDuration / stage.estimatedDuration;
      return progress > this.thresholds.stage_duration_warning;
    });
  }

  async triggerReallocation(bottlenecks, workflowInstance) {
    for (const bottleneck of bottlenecks) {
      const reallocationPlan = await this.resourceAllocator.planReallocation(bottleneck);
      
      if (reallocationPlan.feasible) {
        await this.executeReallocation(reallocationPlan, workflowInstance);
        this.alertManager.notifyReallocation(bottleneck, reallocationPlan);
      } else {
        this.alertManager.escalateBottleneck(bottleneck, workflowInstance);
      }
    }
  }
}
```

### Gestion Dynamique des Ressources et Réallocation

#### Optimisation Automatique des Charges
```javascript
class ResourceAllocator {
  constructor() {
    this.departmentCapacity = new Map();
    this.skillMatrix = new SkillMatrix();
    this.loadBalancer = new LoadBalancer();
  }

  async planReallocation(bottleneck) {
    // Analyser les ressources disponibles
    const availableResources = await this.getAvailableResources(bottleneck.department);
    
    // Identifier les agents pouvant aider
    const capableAgents = this.findCapableAgents(bottleneck.requiredSkills);
    
    // Calculer l'impact de la réallocation
    const reallocationOptions = this.generateReallocationOptions(
      bottleneck,
      availableResources,
      capableAgents
    );
    
    // Sélectionner la meilleure option
    return this.selectOptimalReallocation(reallocationOptions);
  }

  findCapableAgents(requiredSkills) {
    return this.skillMatrix.findAgentsWithSkills(requiredSkills)
      .filter(agent => agent.availability > 0.3) // Au moins 30% de disponibilité
      .sort((a, b) => b.skillMatch - a.skillMatch);
  }

  async executeReallocation(plan, workflowInstance) {
    // Notifier les parties prenantes
    await this.notifyStakeholders(plan);
    
    // Réassigner les tâches
    for (const reassignment of plan.reassignments) {
      await workflowInstance.reassignTask(
        reassignment.taskId,
        reassignment.fromAgent,
        reassignment.toAgent
      );
    }
    
    // Mettre à jour les métriques
    this.updateCapacityMetrics(plan);
    
    return { success: true, plan };
  }
}
```

### Points de Synchronisation Inter-Département

#### Gates de Validation Intelligents
```yaml
# sync-points-config.yaml
synchronization_gates:
  cultural_compliance_gate:
    trigger_conditions:
      - cultural_assessment.completed
      - legal_verification.approved
    
    validation_criteria:
      - cultural_sensitivity_score: ">= 8/10"
      - legal_compliance_status: "approved"
      - market_fit_assessment: ">= 7/10"
    
    stakeholders:
      required: ["cultural_expert", "compliance_manager"]
      optional: ["marketing_lead", "product_manager"]
    
    escalation_rules:
      - condition: "validation_pending > 24h"
        action: "notify_department_heads"
      - condition: "validation_pending > 48h"
        action: "escalate_to_management"
    
    auto_approval_criteria:
      - all_scores: ">= 9/10"
      - risk_level: "low"
      - similar_products_approved: ">= 3"

  technical_readiness_gate:
    trigger_conditions:
      - technical_integration.completed
      - security_audit.passed
      - performance_tests.passed
    
    validation_criteria:
      - integration_tests_passed: "100%"
      - security_score: ">= 9/10"
      - performance_benchmarks: "met"
    
    parallel_validation: true
    max_validation_time: "4 hours"
```

### Intégration Claude Code/Orchestrateur BMAD

#### Extension des Commandes BMAD
```javascript
// bmad-orchestrator workflow extensions
const workflowCommands = {
  '*workflow-status': async () => {
    const activeWorkflows = await this.getActiveWorkflows();
    return this.formatWorkflowStatus(activeWorkflows);
  },
  
  '*workflow-bottlenecks': async () => {
    const bottlenecks = await this.detectCurrentBottlenecks();
    return this.formatBottleneckReport(bottlenecks);
  },
  
  '*department-load': async (department) => {
    const load = await this.getDepartmentLoad(department);
    return this.formatLoadReport(department, load);
  },
  
  '*workflow-optimize': async (workflowId) => {
    const optimization = await this.optimizeWorkflow(workflowId);
    return this.formatOptimizationSuggestions(optimization);
  },
  
  '*cross-dept-sync': async () => {
    const syncStatus = await this.getCrossDepartmentSyncStatus();
    return this.formatSyncReport(syncStatus);
  }
};
```

### Workflows.json Génération Intelligente

#### Structure Adaptative par Projet
```json
{
  "project_type": "marketplace_diaspora",
  "workflows": {
    "vendor_onboarding": {
      "priority": "high",
      "estimated_duration": "7-10 days",
      "departments": ["compliance", "cultural", "tech"],
      "parallel_execution": ["cultural_assessment", "technical_setup"],
      "bottleneck_prevention": {
        "compliance_fallback": "bmad-legal-assistant",
        "cultural_fallback": "bmad-market-analyst",
        "tech_fallback": "bmad-fullstack-architect"
      }
    },
    
    "product_launch_cultural": {
      "priority": "medium",
      "estimated_duration": "10-14 days",
      "dependencies": ["vendor_onboarding"],
      "optimization_rules": {
        "parallel_marketing_tech": true,
        "cultural_validation_required": true,
        "auto_scaling_enabled": true
      }
    }
  },
  
  "monitoring": {
    "real_time_tracking": true,
    "bottleneck_detection": true,
    "auto_reallocation": true,
    "escalation_enabled": true
  },
  
  "performance_targets": {
    "average_completion_time": "< 12 days",
    "bottleneck_resolution_time": "< 4 hours",
    "department_satisfaction": "> 8/10",
    "workflow_success_rate": "> 95%"
  }
}
```

## Contraintes Respectées

- **Compatibilité Claude Code** : Extensions naturelles des commandes existantes
- **Points de synchronisation** : Validation inter-département automatisée
- **Dépendances modules** : Integration avec modules 3 (PRD) et 4 (Configuration agents)
- **Agile-friendly** : Support des sprints et méthologies agiles

## Résultats Attendus

- **Réduction 60%** des délais inter-département
- **Amélioration 80%** de la détection précoce des bottlenecks  
- **Augmentation 90%** de la satisfaction des équipes
- **Optimisation 70%** de l'utilisation des ressources