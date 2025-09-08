# Architecture MCP Security System - BMAD Studio Template

## Vue d'ensemble

Le système de sécurité MCP (Model Context Protocol) intégré dans BMAD Studio Template fournit une couche de sécurité robuste pour valider et auditer toutes les opérations des agents BMAD. Il s'intègre parfaitement avec l'architecture existante en utilisant les composants `ErrorHandler`, `Logger`, et `DynamicAgentConfigurator`.

## Composants Architecture

### 1. Configuration Whitelist (`configs/mcp/whitelist.yaml`)

**Responsabilité** : Définit les règles de sécurité par agent BMAD
**Intégration** : Utilise les codes d'erreur BMadError pour la cohérence

```yaml
agents:
    bmad-orchestrator:
        permissions:
            level: 'admin'
            allowed_operations: ['agent_coordination', 'workflow_management']
            rate_limits:
                requests_per_minute: 200
```

**Fonctionnalités** :

- Permissions granulaires par agent
- Rate limiting configurable
- Restrictions de chemins et domaines
- Configuration par environnement
- Intégration avec Vault audit existant

### 2. Audit Logger (`lib/core/MCPAuditLogger.ts`)

**Responsabilité** : Enregistrement sécurisé de tous les événements MCP
**Intégration** : Étend le système Logger existant avec fonctionnalités spécialisées

```typescript
interface MCPAuditEvent {
    timestamp: string;
    eventId: string;
    agent: string;
    operation: string;
    status: 'success' | 'blocked' | 'error' | 'rate_limited';
    severity: ErrorSeverity;
    metadata: Record<string, unknown>;
}
```

**Fonctionnalités** :

- Format JSONL pour parsing efficace
- Rotation automatique des logs
- Masquage des données sensibles
- Intégration Vault pour événements critiques
- Métriques Prometheus

### 3. Security Middleware (`lib/core/MCPSecurityMiddleware.ts`)

**Responsabilité** : Validation en temps réel des requêtes MCP
**Intégration** : Utilise BMadError pour la gestion d'erreurs cohérente

```typescript
interface ValidationResult {
    allowed: boolean;
    reason?: string;
}
```

**Pipeline de validation** :

1. Vérification agent enregistré
2. Contrôle rate limiting
3. Validation permissions opération
4. Vérification restrictions chemins
5. Validation domaines autorisés
6. Contrôle commandes système

### 4. Security Manager (`lib/core/MCPSecurityManager.ts`)

**Responsabilité** : Orchestrateur principal du système de sécurité
**Intégration** : Point d'entrée unique pour DynamicAgentConfigurator

```typescript
class MCPSecurityManager {
    // Méthodes d'intégration avec les agents BMAD
    validateAgentOperation(agentId, operationType, targetResource): boolean;
    validateFileOperation(agent, operation, filePath): ValidationResult;
    validateNetworkOperation(agent, operation, domain): ValidationResult;
    validateSystemCommand(agent, command, args): ValidationResult;
}
```

**Statistiques et monitoring** :

- Métriques en temps réel
- Statut de santé du système
- Rapports d'audit automatisés
- Intégration Prometheus

## Flow d'intégration avec BMAD

### 1. Initialisation du système

```typescript
// Dans DynamicAgentConfigurator.js
import { MCPSecurityManager, DEFAULT_SECURITY_CONFIGS } from './MCPSecurityManager';

const securityManager = MCPSecurityManager.getInstance(DEFAULT_SECURITY_CONFIGS[environment]);
```

### 2. Validation d'opération agent

```typescript
// Avant exécution d'opération agent
const isAllowed = await securityManager.validateAgentOperation(
    agentId,
    operationType,
    targetResource,
    context
);

if (!isAllowed) {
    throw new BMadError('Operation not allowed by security policy', {
        code: 'AGENT_OPERATION_BLOCKED',
        severity: ErrorSeverity.HIGH,
    });
}
```

### 3. Audit automatique

```typescript
// Audit automatique via middleware
await securityManager.validateMCPRequest(agent, operation, resource, context);
// → Génère automatiquement les logs d'audit en format JSONL
```

## Patterns de sécurité

### 1. Rate Limiting par agent

```yaml
agents:
    dev:
        rate_limits:
            requests_per_minute: 100
            burst_limit: 25
```

### 2. Restrictions de chemins avec wildcards

```yaml
agents:
    qa:
        permissions:
            allowed_paths:
                - '/tests/**'
                - '/lib/analyzers/**'
            blocked_paths:
                - '/configs/security/**'
```

### 3. Validation de domaines

```yaml
agents:
    marketplace-expert:
        permissions:
            domains:
                allowed:
                    - '*.stripe.com'
                    - '*.paypal.com'
                blocked:
                    - '*.suspicious.com'
```

### 4. Commandes système restreintes

```yaml
commands:
    blocked: ['rm -rf', 'chmod 777', 'sudo']
    restricted:
        - command: 'git'
          allowed_args: ['status', 'log', 'diff']
          blocked_args: ['push', 'pull', 'clone']
```

## Intégration avec systèmes existants

### 1. ErrorHandler Integration

```typescript
// Codes d'erreur MCP standardisés
const MCP_ERROR_CODES = {
    WHITELIST_VIOLATION: 'MCP_WHITELIST_001',
    RATE_LIMIT_EXCEEDED: 'MCP_WHITELIST_002',
    UNAUTHORIZED_PATH: 'MCP_WHITELIST_003',
};
```

### 2. Vault Audit Integration

```typescript
// Envoi automatique vers Vault pour événements critiques
if (event.severity === ErrorSeverity.CRITICAL) {
    await sendToVaultAudit(event);
}
```

### 3. Prometheus Metrics

```typescript
// Métriques automatiques
- mcp_requests_total{agent, operation, status}
- mcp_blocked_requests_total{agent, violation_type}
- mcp_operation_duration_seconds{agent, operation}
```

## Configuration par environnement

### Development

- Rate limiting relaxé (multiplier 2.0)
- Vault désactivé
- Prometheus désactivé
- Logs locaux uniquement

### Staging

- Rate limiting standard (multiplier 1.5)
- Vault activé
- Prometheus activé
- Validation stricte

### Production

- Rate limiting strict (multiplier 0.8)
- Toutes les sécurités activées
- Logging enhanced
- Monitoring complet

## Exemple d'utilisation complète

```typescript
import { MCPIntegrationExample } from './lib/core/MCPIntegrationExample';

// Démo complète du système
const demo = new MCPIntegrationExample('development');
await demo.runAllExamples();

// Résultats attendus:
// ✅ bmad-orchestrator/agent_coordination → Autorisé
// ❌ dev/curl → Bloqué (commande interdite)
// ✅ qa/test_execution → Autorisé
// ❌ unknown-agent/any_operation → Bloqué (agent non enregistré)
```

## Avantages du système

### 1. Sécurité renforcée

- Validation en temps réel de toutes les opérations
- Rate limiting automatique
- Audit complet et traçabilité

### 2. Intégration transparente

- Compatible avec l'architecture BMAD existante
- Utilise les patterns ErrorHandler/Logger
- Pas de modification des agents existants

### 3. Flexibilité

- Configuration YAML facile à maintenir
- Rules par environnement
- Extensible pour nouveaux types d'agents

### 4. Monitoring et observabilité

- Métriques Prometheus intégrées
- Logs structurés JSONL
- Rapports d'audit automatisés
- Statut de santé en temps réel

## Maintenance et opérations

### 1. Rechargement de configuration

```typescript
await securityManager.reloadConfiguration();
```

### 2. Monitoring de santé

```typescript
const health = securityManager.getHealthStatus();
// status: 'healthy' | 'degraded' | 'unhealthy'
```

### 3. Génération de rapports

```typescript
const report = await securityManager.generateAuditReport(startDate, endDate);
```

### 4. Rotation des logs

- Rotation automatique basée sur la taille (100MB par défaut)
- Nettoyage automatique (90 jours de rétention)
- Archivage avec horodatage

## Évolutions futures

### 1. Machine Learning pour détection d'anomalies

- Analyse des patterns d'utilisation
- Détection automatique de comportements suspects

### 2. Integration avec systèmes externes

- SIEM integration
- Webhook notifications
- Slack/Teams alerts

### 3. Interface web de monitoring

- Dashboard en temps réel
- Gestion des règles via UI
- Visualisation des métriques

### 4. Tests de pénétration automatisés

- Simulation d'attaques
- Validation des règles de sécurité
- Reporting de vulnérabilités

## Conclusion

Le système MCP Security fournit une couche de sécurité robuste et transparente pour l'écosystème BMAD, garantissant que toutes les opérations des agents sont validées, auditées et conformes aux politiques de sécurité définies, tout en s'intégrant parfaitement avec l'architecture existante.
