# BMAD-Studio Template 🚀

**Framework évolutif intelligent pour projets agiles avec configuration automatique d'agents, workflows et MCP**

## 🎯 Vision

BMAD-Studio Template est un framework évolutif qui s'adapte automatiquement à tout type de projet en générant PRD et architecture après brainstorming, puis configure intelligemment les agents, workflows, hooks et MCP appropriés.

## ⚡ Installation Rapide

```bash
# Installation globale
npm install -g bmad-studio-template

# Ou utilisation directe avec npx
npx bmad-studio-template my-project
```

## 🧠 Intelligence Adaptative

Le template analyse votre brief et génère automatiquement:
- ✅ **PRD détaillé** avec architecture technique
- ✅ **Configuration d'agents** optimisée pour votre projet
- ✅ **Workflows personnalisés** selon vos besoins
- ✅ **Hooks MCP** pour intégration Claude seamless
- ✅ **Structure projet** adaptée au domaine

## 🎪 Agents Spécialisés Disponibles

### Core Agents (Toujours présents)
- 🎭 **bmad-orchestrator** - Coordination générale et workflows
- 🏗️ **architect** - Architecture système et technique
- 💻 **dev** - Développement full-stack
- 🔍 **qa** - Qualité et validation
- 📊 **analyst** - Recherche et analyse

### Agents Spécialisés (Configurés selon projet)
- 🛒 **marketplace-expert** - E-commerce et marketplaces
- 🎨 **ux-expert** - Design et expérience utilisateur
- 📈 **pm** - Product management
- ⚙️ **devops** - Infrastructure et déploiement
- 🌍 **localization** - Internationalisation
- 🔐 **security** - Sécurité et compliance

## 🔄 Workflows Adaptatifs

Le template inclut des workflows qui s'activent selon le contexte:

### Workflows Core
- `greenfield-fullstack` - Nouveau projet complet
- `brownfield-enhancement` - Amélioration projet existant
- `parallel-development` - Développement parallèle multi-domaines

### Workflows Spécialisés
- `marketplace-mvp-launch` - Lancement marketplace
- `mobile-first-pwa` - Application mobile-first
- `enterprise-integration` - Intégration entreprise
- `ai-ml-pipeline` - Projets IA/ML

## 🪝 Hooks MCP Intelligents

Configuration automatique des hooks Claude selon le projet:
- **Pre-commit hooks** - Validation code et architecture
- **Story completion hooks** - Validation user stories
- **Deployment hooks** - Validation pre-déploiement
- **Performance hooks** - Monitoring performance

## 🚀 Utilisation

### 1. Initialisation Interactive

```bash
bmad-studio init my-project
```

### 2. Brief et Brainstorming

Le système vous guide pour:
- Définir la vision et objectifs
- Identifier les parties prenantes
- Spécifier les exigences techniques
- Choisir les contraintes et préférences

### 3. Génération Automatique

Le template génère automatiquement:
- PRD structuré et architecture technique
- Configuration agents optimisée
- Workflows personnalisés
- Hooks MCP configurés

### 4. Développement Agile

Une fois initialisé, votre projet dispose de:
- Agents prêts à l'emploi
- Workflows adaptés
- Documentation générée
- Intégration Claude seamless

## 🎨 Types de Projets Supportés

### 🌐 Web Applications
- SPA (React, Vue, Angular)
- Full-stack applications
- Progressive Web Apps

### 📱 Mobile
- Mobile-first PWAs
- Hybrid applications
- Native app support

### 🛒 E-commerce
- Marketplaces multi-vendeurs
- Boutiques en ligne
- Plateformes B2B

### 🏢 Enterprise
- Systèmes de gestion
- Intégrations ERP
- Plateformes internes

### 🤖 AI/ML
- Pipelines ML
- Applications IA
- Chatbots intelligents

## ⚙️ Configuration Avancée

### Variables d'Environment

```bash
# Configuration OpenAI pour analyse PRD
OPENAI_API_KEY=your_key_here

# Configuration Claude MCP
CLAUDE_MCP_ENABLED=true

# Mode debug
BMAD_DEBUG=true
```

### Configuration Personnalisée

```yaml
# bmad-config.yaml
project:
  type: auto-detect
  complexity: adaptive
  
agents:
  auto_configure: true
  custom_agents: []
  
workflows:
  default_strategy: parallel
  validation_level: strict
  
mcp:
  hooks_enabled: true
  custom_hooks: []
```

## 📚 Documentation

- [Guide Démarrage](docs/getting-started.md)
- [Configuration Agents](docs/agents.md)
- [Workflows Personnalisés](docs/workflows.md)
- [Hooks MCP](docs/mcp-hooks.md)
- [API Template](docs/api.md)

## 🤝 Contribution

Contributions bienvenues ! Consultez [CONTRIBUTING.md](CONTRIBUTING.md)

## 📄 Licence

MIT License - voir [LICENSE](LICENSE)

---

**BMAD-Studio Template** - *Intelligence adaptative pour projets agiles* 🚀