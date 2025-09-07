# Recommandations BMAD + Contains — Modules Découpés

Ce dossier contient chaque module de recommandation dans un fichier `.md` séparé.  
Les modules peuvent être pris en charge par des agents en parallèle selon leurs dépendances.

## Liste des modules et dépendances

1. **agents-specialises.md** — Extension de la bibliothèque d’agents (indépendant, peut être fait en parallèle)
2. **analyse-contextuelle-and-brainstorming-enrichi.md** — Amélioration de la phase d’analyse (indépendant, peut être fait en parallèle)
3. **generation-de-prd-and-roadmap-agile.md** — Dépend du module 2
4. **configuration-dynamique-des-agents.md** — Dépend des modules 1 et 2
5. **generateur-de-workflows-agile-multi-departement.md** — Dépend des modules 3 et 4
6. **mcp-model-context-protocol-gestion-avancee.md** — Peut être implémenté en parallèle, utile après module 4
7. **hooks-integrations-and-callbacks.md** — Dépend des modules 3, 4 et 5
8. **configuration-centralisee-and-templates-yaml.md** — Indépendant, supporte tous les autres modules
9. **module-optionnel-flattener-context-provider.md** — Indépendant mais recommandé

## Instructions

- Chaque fichier `.md` contient l’objectif, les tâches techniques et les contraintes.  
- Assigner les modules indépendants à différents agents pour accélérer l’implémentation.  
- Respecter les dépendances pour éviter les conflits.  

Bonne implémentation 🚀
