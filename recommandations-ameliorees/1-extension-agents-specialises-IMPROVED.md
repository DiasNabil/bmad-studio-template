# Module 1: Extension de la bibliothèque d'agents (par département) - AMÉLIORÉ

## Objectif
Enrichir BMAD avec des agents spécialisés par département avec architecture modulaire optimisée et coordination inter-départementale.

## Améliorations Architecturales (Score BMAD: 8.5/10)

### Structure Modulaire Optimisée
```
.bmad-core/
├── agents/
│   ├── departments/
│   │   ├── marketing/
│   │   │   ├── bmad-marketing-strategist.md
│   │   │   ├── bmad-content-creator.md
│   │   │   └── bmad-seo-specialist.md
│   │   ├── design/
│   │   │   ├── bmad-ux-designer.md
│   │   │   ├── bmad-ui-designer.md
│   │   │   └── bmad-design-systems.md
│   │   ├── qa/
│   │   │   ├── bmad-test-engineer.md
│   │   │   ├── bmad-automation-expert.md
│   │   │   └── bmad-performance-tester.md
│   │   └── ops/
│   │       ├── bmad-devops-engineer.md
│   │       ├── bmad-sre.md
│   │       └── bmad-security-expert.md
├── tasks/departments/
└── templates/department-agent-tmpl.yaml
```

### Interface Standardisée Inter-Départementale
```yaml
department_interface:
  department: string
  expertise_areas: [string]
  collaboration_points: [string]
  handoff_protocols: [object]
  shared_deliverables: [string]
```

### Registry Départemental avec Mapping
- **Smart routing** : Algorithme de sélection d'agent basé sur le contexte
- **Conflict detection** : Éviter les duplications d'efforts
- **Expertise registry** : Mapping centralisé des compétences

### Extension bmad-orchestrator
- `*department [dept]` → Liste agents du département
- `*cross-department [task]` → Coordination multi-départementale
- `*expertise-lookup [skill]` → Trouve l'agent expert
- `*handoff [from] [to]` → Transfert entre départements

## Agents Spécialisés Prioritaires

### Priorité 1 - Core Business
1. **Marketing Strategist** - Campagnes, conversion, analytics
2. **UX Researcher** - User research, personas, testing
3. **QA Engineer** - Testing strategies, automation
4. **DevOps Engineer** - CI/CD, infrastructure, monitoring

### Priorité 2 - Spécialisations
5. **Content Creator** - Copy, SEO, social media
6. **Security Expert** - Sécurité, compliance, audits
7. **Performance Engineer** - Optimisation, monitoring
8. **Product Designer** - UI/UX, prototyping

### Priorité 3 - Support
9. **Data Analyst** - Métriques, reporting, insights
10. **Customer Success** - Support, onboarding, retention

## Intégration Marketplace
- **Agent marketplace-qa** : Tests spécifiques e-commerce
- **Agent marketplace-marketing** : Conversion, acquisition
- **Agent marketplace-ops** : Gestion multi-vendeurs, paiements

## Plan d'Implémentation
1. **Phase 1** : Template + 4 agents priorité 1
2. **Phase 2** : Extension AgentManager + orchestration
3. **Phase 3** : Agents priorité 2 + métriques
4. **Phase 4** : Agents priorité 3 + optimisations

## Contraintes Respectées
- Maintien compatibilité système d'agents existant BMAD
- Structure YAML identique au `bmad-master.md`
- Dependencies mapping vers `.bmad-core/{type}/{name}`
- Governance et standards pour éviter silos départementaux