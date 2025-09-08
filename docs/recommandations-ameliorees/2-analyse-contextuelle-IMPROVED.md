# Module 2: Analyse contextuelle & Brainstorming enrichi - AMÉLIORÉ

## Objectif

Améliorer la phase de définition du projet avec détection automatique intelligente et analyse contextuelle optimisée.

## Améliorations par l'Analyste BMAD

### Structure projectProfile Optimisée

```yaml
projectProfile:
    context:
        domain: [web, mobile, api, desktop, data, ai]
        complexity: [simple, moderate, complex, enterprise]
        phase: [conception, development, maintenance, migration]
    technical:
        stack: auto-detected
        architecture: [monolith, microservices, serverless, hybrid]
        constraints: []
    business:
        timeline: estimated
        budget_tier: [startup, sme, enterprise]
        stakeholders: auto-detected
    bmad_routing:
        primary_agents: []
        recommended_templates: []
        suggested_workflows: []
```

### Techniques NLP Pragmatiques BMAD

Au lieu de LLM lourd (maintien performance) :

- **Keyword clustering** avec dictionnaires de domaines pré-établis
- **Pattern matching** sur structure de fichiers existants
- **Semantic similarity** légère via embeddings pré-calculés
- **Rule-based detection** pour stack technique

### Détecteurs Contextuels Intelligents

#### 1. Stack Detection

- Analyse package.json → projet web/node
- Présence requirements.txt → projet Python
- Structure MVC → application web classique

#### 2. Domain Detection

- Mots-clés métier dans documentation existante
- Structure de base de données (si présente)
- APIs externes utilisées

#### 3. Complexity Assessment

- Nombre de modules/services
- Profondeur de l'arborescence
- Nombre de dépendances

### Amélioration UX avec BMAD

- **Validation interactive** : Proposer les détections, permettre corrections
- **Progressive disclosure** : Afficher seulement les options pertinentes
- **Quick start** : Mode rapide avec détections automatiques acceptées
- **Learning mode** : Amélioration continue basée sur les corrections utilisateur

## Implémentation BMAD-Aligned

### Phase 1 - MVP (Simple et efficace)

```yaml
# Ajout au core-config.yaml
project_analysis:
    auto_detection: true
    confidence_threshold: 0.7
    manual_override: always_available
```

### Phase 2 - Enrichissement

- Intégration avec les templates existants
- Cache des profils de projets similaires
- Suggestions basées sur l'historique

### Phase 3 - Intelligence avancée

- Apprentissage depuis les projets précédents
- Détection de patterns organisationnels
- Recommandations prédictives

## Intégration avec init.js Enrichi

- Interrogation utilisateur intelligente avec NLP optionnel
- Analyse automatique du brief pour définir axes projet
- Stockage dans structure `projectProfile` consommable par `AgentConfigurator`
- Détection contextuelle automatisée (ex: "lancement produit" → active `growth-hacker`)

## Contraintes Respectées

- Ne pas casser l'actuel flux interactif BMAD
- Maintenir simplicité : heuristiques simples avant complexité
- Intégration transparente : utilisateur peut ignorer complètement
- Feedback loop pour améliorer futurs projets
- Auto-documentation des choix effectués

## Principes BMAD Appliqués

- **Simplicité** : Commencer par des heuristiques simples
- **Non-invasif** : L'utilisateur garde le contrôle
- **Amélioration continue** : Apprentissage via corrections
- **Performance** : Éviter les solutions lourdes
