# Améliorations proposées

## 1. Glue code BMAD ↔ Contains (priorité haute)

- Créer `lib/core/ContainsAgentRegistry.ts`.
- Charger `configs/agents/contains-registry.yaml` (catalogue).
- Exposer `matchAgents(projectProfile)`.
- Ajouter commandes orchestrateur (`*contains-scan`, `*agent-suggest`).

## 2. Hooks en production (priorité haute)

- Ajouter `lib/hooks/EnterpriseHookManager.ts` et `lib/hooks/metrics.ts`.
- Implémenter isolation, budgets, retry, priorités.
- Événements standard : `onPRDValidated`, `onWorkflowGatePassed`, etc.
- Publier métriques Prometheus.

## 3. MCP safe-by-default (priorité haute)

- CI schema-check bloquant sur `project.mcp.json`.
- Déporter métadonnées dans `bmad-config.yaml`.
- Config `configs/mcp/whitelist.yaml` + audit log `logs/mcp/audit.jsonl`.

## 4. Orchestration multi-dép. (priorité moyenne)

- Générer `workflows/workflow-engine.ts`.
- Ajouter KPI runtime (success rate, bottleneck MTTR).

## 5. PROGRESS-SUMMARY (priorité courte)

- Ajouter indicateurs chiffrés (% agents mappés, % couverture tests, latences, uptime).
