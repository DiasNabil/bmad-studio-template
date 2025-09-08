# Module 8: Configuration centralisée & Templates YAML - AMÉLIORÉ

## Objectif Spécialisé BMAD/Contains/Marketplace

Centraliser la configuration pour que le template s'intègre dans TOUS les usages (marketplace, web, mobile, etc.) avec workflows/agents/hooks/MCP adaptatifs basés sur l'écosystème BMAD.

## Architecture Configuration Hiérarchique Intelligente

### Structure BMAD-Core Étendue

```
.bmad-core/
├── config/
│   ├── templates/
│   │   ├── marketplace-template.yaml
│   │   ├── web-app-template.yaml
│   │   ├── mobile-template.yaml
│   │   └── saas-template.yaml
│   ├── agents/
│   │   ├── base-agents.yaml
│   │   ├── marketplace-agents.yaml
│   │   └── specialized-agents.yaml
│   ├── workflows/
│   │   ├── contains-workflows.yaml
│   │   └── domain-workflows.yaml
│   └── mcp-hooks/
│       ├── universal-mcp.yaml
│       └── domain-mcp.yaml
```

### Templates YAML Adaptatifs

#### Template Marketplace (marketplace-template.yaml)

```yaml
bmad_template:
    name: 'marketplace-diaspora'
    version: '1.0'
    context_detection:
        keywords: ['marketplace', 'e-commerce', 'vendor', 'payment']
        file_patterns: ['*/vendors/*', '*/payments/*', '*marketplace*']

    agents:
        primary:
            - bmad-marketplace-architect
            - bmad-cultural-expert
            - bmad-payment-specialist
        secondary:
            - bmad-logistics-expert
            - bmad-security-compliance

    workflows:
        - marketplace-vendor-onboarding
        - cultural-product-adaptation
        - payment-flow-optimization

    mcp_config:
        - odoo-connector
        - payment-gateway-mcp
        - cultural-data-mcp

    hooks:
        payment_hooks:
            - pre_payment_validation
            - cultural_compliance_check
        vendor_hooks:
            - vendor_verification
            - cultural_product_review
```

#### Template Web-App (web-app-template.yaml)

```yaml
bmad_template:
    name: 'web-application'
    version: '1.0'
    context_detection:
        keywords: ['web', 'frontend', 'backend', 'api']
        file_patterns: ['*/src/*', '*/public/*', 'package.json']

    agents:
        primary:
            - bmad-fullstack-architect
            - bmad-ui-designer
            - bmad-backend-dev
        secondary:
            - bmad-security-expert
            - bmad-performance-optimizer

    workflows:
        - design-iteration-flow
        - development-cycle
        - deployment-pipeline

    mcp_config:
        - analytics-mcp
        - seo-tools-mcp
        - performance-monitoring-mcp
```

### bmad-orchestrator Amélioré avec Détection Contextuelle

#### Nouvelles Commandes Contextuelles

```javascript
// Dans bmad-orchestrator
contextDetection: {
  detectProjectType: (projectStructure) => {
    if (hasMarketplacePatterns(projectStructure)) return 'marketplace';
    if (hasWebAppPatterns(projectStructure)) return 'web-app';
    if (hasMobilePatterns(projectStructure)) return 'mobile';
    return 'generic';
  },

  loadContextualConfig: (projectType) => {
    return loadYAMLTemplate(`${projectType}-template.yaml`);
  }
}

// Commandes étendues
commands: {
  '*marketplace': () => loadMarketplaceAgents(),
  '*web-app': () => loadWebAppAgents(),
  '*detect-context': () => autoDetectAndConfigure(),
  '*cultural-mode': () => activateCulturalAgents()
}
```

### Workflows Contains Studio Optimisés

#### Workflows par Contexte

```yaml
# contains-workflows.yaml
workflows:
    marketplace_workflows:
        vendor_onboarding:
            stages: [verification, cultural_review, approval, integration]
            agents: [bmad-compliance, bmad-cultural, bmad-integration]
            sync_points: [legal_check, cultural_validation]

        product_launch:
            stages: [market_analysis, cultural_adaptation, launch_execution]
            agents: [bmad-analyst, bmad-cultural, bmad-marketing]
            cross_department_gates: [marketing_approval, cultural_compliance]

    web_app_workflows:
        design_iteration:
            stages: [research, design, validation, implementation]
            agents: [bmad-ux, bmad-ui, bmad-dev]
            sync_points: [user_testing, design_review]
```

### Configuration MCP/Hooks Contextuelle

#### MCP Adaptatif par Domaine

```yaml
# domain-mcp.yaml
mcp_configurations:
    marketplace:
        required:
            - odoo_connector:
                  purpose: 'ERP integration for vendors'
                  agents: [bmad-logistics, bmad-financial]
            - cultural_data_mcp:
                  purpose: 'Cultural preferences and data'
                  agents: [bmad-cultural, bmad-marketing]

        optional:
            - payment_gateway_mcp:
                  purpose: 'Multi-currency payment processing'
                  condition: 'has_payment_features'

    web_app:
        required:
            - analytics_mcp:
                  purpose: 'User behavior tracking'
                  agents: [bmad-analyst, bmad-marketing]

        optional:
            - seo_tools_mcp:
                  purpose: 'SEO optimization'
                  condition: 'has_public_pages'
```

#### Hooks Universels avec Spécialisation

```yaml
# universal-hooks.yaml
hooks_system:
    universal_hooks:
        pre_deploy:
            - security_scan
            - performance_check
            - compliance_validation

        post_deploy:
            - monitoring_setup
            - metrics_initialization

    specialized_hooks:
        marketplace:
            pre_payment:
                - currency_validation
                - cultural_compliance
                - fraud_detection

            vendor_onboarding:
                - document_verification
                - cultural_assessment

        web_app:
            pre_release:
                - seo_validation
                - accessibility_check
                - performance_audit
```

## Intégration avec Système Existant

### Détection Automatique de Contexte

```javascript
// Auto-détection basée sur la structure projet
const contextDetectors = {
    marketplace: (files) => {
        return files.some(
            (f) => f.includes('vendor') || f.includes('payment') || f.includes('marketplace')
        );
    },

    cultural: (files) => {
        return files.some(
            (f) => f.includes('diaspora') || f.includes('cultural') || f.includes('translation')
        );
    },
};
```

### Configuration Agile Intégrée

- **Sprint-aware configuration** : Config adaptée aux cycles agiles
- **Story-driven agent activation** : Agents activés selon les user stories
- **Continuous integration** avec validation contextuelle

## Avantages pour l'Écosystème BMAD

### Flexibilité Universelle

- Un template s'adapte à marketplace, web-app, mobile, SaaS
- Réutilisation des patterns BMAD avec spécialisation contextuelle
- Évolutivité sans réingénierie

### Efficacité Contains Studio

- Agents activés automatiquement selon le contexte détecté
- Workflows optimisés par domaine métier
- Handoffs intelligents entre agents spécialisés

### Excellence Marketplace

- Spécialisation diaspora native intégrée
- Workflows e-commerce avec agents culturels
- Architecture évolutive pour expansion internationale

## Contraintes Respectées

- Support de tous les autres modules BMAD
- Facilité d'usage avec détection automatique
- Compatibilité avec bmad-orchestrator existant
- Maintien des patterns YAML BMAD établis
