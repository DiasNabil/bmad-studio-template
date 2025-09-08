# BMAD Configuration Migration Guide

## Vue d'ensemble

Ce guide documente la migration des métadonnées BMAD vers un fichier de configuration unifié `bmad-config.yaml`. Cette migration centralise toutes les configurations dans un seul fichier pour améliorer la maintenabilité et la cohérence.

## 🎯 Objectifs de la migration

- **Centralisation** : Un seul fichier de configuration `bmad-config.yaml`
- **Sécurité intégrée** : Configuration MCP whitelist/audit intégrée
- **Agents unifiés** : Configuration agents BMAD et mappings centralisés
- **Monitoring unifié** : Métriques Prometheus et alerting intégrés
- **Multi-environnements** : Support complet dev/staging/prod
- **Hooks intégrés** : Configuration hooks Claude Code
- **Validation avancée** : Règles de validation et quality gates

## 📁 Structure avant migration

```
bmad-studio-template/
├── .bmad-core/
│   ├── core-config.yaml          # Configuration principale
│   └── project-metadata.json     # Métadonnées projet
├── configs/
│   ├── agents/
│   │   └── contains-registry.yaml # Registre agents
│   ├── mcp/
│   │   └── whitelist.yaml        # Sécurité MCP
│   ├── security/
│   │   ├── vault-config.hcl      # Configuration Vault
│   │   └── security-scan.sh      # Scripts sécurité
│   └── monitoring/
│       └── prometheus-config.yaml # Configuration monitoring
└── ...
```

## 📁 Structure après migration

```
bmad-studio-template/
├── bmad-config.yaml              # ✨ Configuration unifiée
├── .migration-backup/            # 💾 Sauvegarde configs originales
│   ├── .bmad-core_core-config.yaml
│   └── configs_mcp_whitelist.yaml
├── bin/
│   ├── migrate-config.ts         # 🚀 Script de migration
│   ├── validate-config.ts        # ✅ Script de validation
│   └── test-migration.ts         # 🧪 Tests compatibilité
├── lib/utils/
│   ├── ConfigMigrator.ts         # 🔧 Utilitaire migration
│   └── ConfigValidator.ts        # 🔍 Validateur configuration
└── ...
```

## 🚀 Guide de migration

### Étape 1 : Préparation

1. **Sauvegardez vos configurations actuelles** :

    ```bash
    git add -A && git commit -m "Backup before BMAD config migration"
    ```

2. **Vérifiez les fichiers existants** :
    ```bash
    ls -la .bmad-core/
    ls -la configs/
    ```

### Étape 2 : Exécution de la migration

1. **Lancez le script de migration** :

    ```bash
    npx ts-node bin/migrate-config.ts
    ```

2. **Options disponibles** :
    ```bash
    npx ts-node bin/migrate-config.ts --help     # Aide
    npx ts-node bin/migrate-config.ts --dry-run  # Aperçu sans modification
    npx ts-node bin/migrate-config.ts --force    # Force la migration
    ```

### Étape 3 : Validation

1. **Validez la configuration migrée** :

    ```bash
    npx ts-node bin/validate-config.ts
    ```

2. **Exécutez les tests de compatibilité** :
    ```bash
    npx ts-node bin/test-migration.ts
    ```

### Étape 4 : Vérification

1. **Inspectez le fichier généré** :

    ```bash
    cat bmad-config.yaml
    ```

2. **Vérifiez la sauvegarde** :
    ```bash
    ls -la .migration-backup/
    ```

## 📄 Structure du fichier unifié

### Sections principales

```yaml
# Configuration unifiée bmad-config.yaml
version: '3.0.0'
created: '2025-09-08'

# Métadonnées projet
project:
    name: 'bmad-studio-template'
    description: 'BMAD Studio Development Template'
    type: 'template'
    category: 'devops-infrastructure'
    security_level: 'enterprise'
    compliance: ['GDPR', 'CCPA', 'OWASP', 'CIS']

# Sécurité intégrée (MCP + Vault + Scanning)
security:
    mcp:
        enabled: true
        global:
            rate_limits:
                requests_per_minute: 100
        blocked_commands: ['rm -rf', 'sudo', 'chmod 777']

    secrets_management:
        provider: 'vault'
        encryption: 'AES-256'

    vulnerability_scanning:
        enabled: true
        provider: 'snyk'

# Configuration agents BMAD
agents:
    validation_required: true
    fallback_enabled: true
    specialized_agents:
        - name: 'bmad-orchestrator'
          enabled: true
          priority: 'critical'
          permissions:
              level: 'admin'
              rate_limits:
                  requests_per_minute: 200

# Monitoring unifié (Prometheus + Grafana + Alerting)
monitoring:
    metrics:
        provider: 'prometheus'
        mcp_metrics:
            enabled: true
    dashboards:
        provider: 'grafana'
        auto_provision: true
    alerting:
        enabled: true
        channels: ['slack', 'email']

# Environnements
environments:
    development:
        enabled: true
        mcp:
            relaxed_mode: true
    production:
        enabled: true
        mcp:
            strict_validation: true

# Validation et quality gates
validation:
    enabled: true
    rules:
        config_validation:
            enabled: true
        security_validation:
            enabled: true
        performance_validation:
            enabled: true

# Métadonnées de migration
migration:
    version: '1.0'
    source_files:
        - '.bmad-core/core-config.yaml'
        - 'configs/mcp/whitelist.yaml'
    compatibility:
        DynamicAgentConfigurator: true
        MCPSecurityManager: true
        ErrorHandler: true
```

## 🔧 Outils de migration

### ConfigMigrator

Utilitaire principal qui :

- Détecte les configurations legacy
- Fusionne les configurations
- Crée des sauvegardes
- Valide la migration
- Met à jour les références

### ConfigValidator

Validateur qui vérifie :

- Structure de configuration
- Règles sémantiques
- Compatibilité système
- Qualité (score 0-100)

### Scripts CLI

- `migrate-config.ts` : Lance la migration
- `validate-config.ts` : Valide la configuration
- `test-migration.ts` : Tests de compatibilité

## ⚡ Compatibilité système

### DynamicAgentConfigurator

- ✅ Configuration agents préservée
- ✅ Fallback mechanism intégré
- ✅ Cache et performance maintenus

### MCPSecurityManager

- ✅ Whitelist intégrée dans `security.mcp`
- ✅ Rate limits préservés
- ✅ Permissions agents migrées

### ErrorHandler (BMadError)

- ✅ Codes d'erreur intégrés
- ✅ Mapping de sévérité
- ✅ Context handling

### Prometheus Metrics

- ✅ Métriques existantes préservées
- ✅ Métriques MCP ajoutées
- ✅ Configuration exporters

## 🔍 Validation et tests

### Tests automatiques

La migration inclut des tests automatiques pour :

```bash
# Tests de base
✅ Unified Config Exists
✅ Config Structure Validation
✅ DynamicAgentConfigurator Compatibility
✅ MCPSecurityManager Integration

# Tests d'intégration
✅ ErrorHandler Integration
✅ Prometheus Metrics Compatibility
✅ Environment Configuration
✅ Migration Metadata

# Tests système
✅ Package.json Scripts
✅ TypeScript Compilation
```

### Scores de qualité

- **90-100** : Configuration excellente ⭐
- **75-89** : Configuration bonne ✅
- **60-74** : Configuration acceptable ⚠️
- **< 60** : Configuration à améliorer 🔧

## 🚨 Dépannage

### Problèmes courants

1. **Config file not found**
    - Vérifiez que vous êtes dans le bon répertoire
    - Lancez `ls -la bmad-config.yaml`

2. **Migration failed - parsing error**
    - Vérifiez la syntaxe YAML des fichiers source
    - Consultez les logs d'erreur

3. **Validation errors**
    - Utilisez `validate-config.ts --verbose`
    - Corrigez les champs requis manquants

4. **Compatibility tests failed**
    - Exécutez `test-migration.ts --critical`
    - Vérifiez les dépendances système

### Restauration

En cas de problème, restaurez depuis la sauvegarde :

```bash
# Restaurer depuis Git
git checkout HEAD -- .bmad-core/ configs/

# Ou depuis la sauvegarde de migration
cp .migration-backup/.bmad-core_core-config.yaml .bmad-core/core-config.yaml
cp .migration-backup/configs_mcp_whitelist.yaml configs/mcp/whitelist.yaml
```

## 📝 Post-migration

### Actions recommandées

1. **Tests complets** :

    ```bash
    npm test
    npm run lint
    npm run build
    ```

2. **Mise à jour CI/CD** :
    - Vérifiez les pipelines
    - Mettez à jour les références de fichiers

3. **Documentation équipe** :
    - Informez l'équipe du changement
    - Mettez à jour les procédures

4. **Nettoyage** (optionnel) :
    ```bash
    # Après vérification complète
    rm -rf .migration-backup/
    ```

## 🔄 Rollback

Si nécessaire, rollback manuel :

1. **Restaurer les fichiers originaux** :

    ```bash
    git checkout HEAD~1 -- .bmad-core/ configs/
    ```

2. **Supprimer les fichiers migrés** :

    ```bash
    rm bmad-config.yaml
    ```

3. **Restaurer les références code** :
    ```bash
    git checkout HEAD~1 -- lib/configurators/
    ```

## 📚 Ressources

- [BMAD Studio Documentation](./docs/)
- [Configuration Schema](./schemas/bmad-config-schema.json)
- [Error Codes Reference](./docs/error-codes.md)
- [Agent Configuration Guide](./docs/agent-configuration.md)

## 🤝 Support

En cas de problème :

1. Consultez les logs : `cat .migration-backup/migration.log`
2. Exécutez les diagnostics : `npx ts-node bin/test-migration.ts --verbose`
3. Contactez l'équipe DevOps BMAD

---

**✨ La migration BMAD Config unifie et simplifie la gestion de configuration tout en préservant la compatibilité avec l'architecture existante !**
