# 2-analyse-contextuelle — Version corrigée


---

## 🚀 Roadmap Progressive

- **Phase 1 (MVP)** : Implémentation simple et fonctionnelle.
- **Phase 2 (Enrichissement)** : Optimisations avancées (NLP, scoring, orchestration multi-départements...).
- **Phase 3 (Production Ready)** : Sécurité renforcée, monitoring, validation humaine et interopérabilité complète Claude Code.

---

## ⚠️ Corrections Clés
- **Hooks ≠ MCP** : bien distinguer callbacks internes (git, tests, déploiement) et protocoles externes (serveurs MCP).  
- **Compatibilité Claude Code** : `project.mcp.json` doit rester conforme au schéma officiel. Stocker les métadonnées enrichies dans `bmad-config.yaml` plutôt que dans `project.mcp.json`.  
- **Sécurité MCP** : n’accepter que des MCP whitelisted (Anthropic + LobeHub validés), audit log obligatoire, validation humaine avant activation.  

---

(Contenu complet original de 2-analyse-contextuelle-IMPROVED.md inséré ici...)