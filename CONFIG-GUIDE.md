# Guide de Configuration - BMAD Studio Template

Ce guide vous aidera à configurer correctement votre environnement BMAD Studio Template en utilisant le fichier `.env.example` fourni.

## Table des matières

1. [Configuration rapide](#configuration-rapide)
2. [Variables obligatoires](#variables-obligatoires)
3. [Configuration par service](#configuration-par-service)
4. [Sécurité et bonnes pratiques](#sécurité-et-bonnes-pratiques)
5. [Configuration par environnement](#configuration-par-environnement)
6. [Dépannage](#dépannage)

## Configuration rapide

### Étape 1 : Créer votre fichier .env

```bash
# Copiez le fichier exemple
cp .env.example .env

# Éditez le fichier avec vos valeurs
nano .env
```

### Étape 2 : Variables minimales pour démarrer

Pour un démarrage rapide, configurez au minimum ces variables :

```env
NODE_ENV=development
APP_NAME=bmad-studio-template
APP_URL=http://localhost:3000

# Base de données
POSTGRES_HOST=localhost
POSTGRES_DB=bmad_studio_db
POSTGRES_USER=bmad_admin
POSTGRES_PASSWORD=votre_mot_de_passe_postgresql

# Redis
REDIS_HOST=localhost
REDIS_PASSWORD=votre_mot_de_passe_redis

# Sécurité
JWT_SECRET=votre_clé_jwt_minimum_32_caractères_ici
ENCRYPTION_KEY=votre_clé_chiffrement_exactement_32_octets
```

## Variables obligatoires

### 🔴 Critiques - L'application ne démarrera pas sans ces variables

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NODE_ENV` | Environnement d'exécution | `production` |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL | `SecurePass123!` |
| `REDIS_PASSWORD` | Mot de passe Redis | `RedisSecure123!` |
| `JWT_SECRET` | Clé secrète JWT (min. 32 chars) | `your-super-secret-jwt-key-32-chars` |
| `ENCRYPTION_KEY` | Clé de chiffrement (exactement 32 octets) | `12345678901234567890123456789012` |

### 🟡 Importantes - Requis pour les fonctionnalités principales

| Variable | Description | Défaut si absent |
|----------|-------------|------------------|
| `APP_URL` | URL de base de l'application | `http://localhost:3000` |
| `DATABASE_URL` | URL complète de la base | Construite automatiquement |
| `REDIS_URL` | URL complète Redis | Construite automatiquement |

## Configuration par service

### 1. Base de données PostgreSQL

#### Configuration de base
```env
# Connexion principale
POSTGRES_HOST=your-db-host.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=bmad_studio_production
POSTGRES_USER=bmad_admin
POSTGRES_PASSWORD=VotrePaSSwordSécurisé123!

# Utilisateurs spécialisés (recommandé pour la production)
POSTGRES_APP_PASSWORD=password_pour_application
POSTGRES_READONLY_PASSWORD=password_pour_lecture_seule
POSTGRES_MONITORING_PASSWORD=password_pour_monitoring
```

#### Configuration SSL (Production obligatoire)
```env
POSTGRES_SSL_MODE=require
POSTGRES_SSL_CERT_PATH=/etc/ssl/certs/postgresql.crt
POSTGRES_SSL_KEY_PATH=/etc/ssl/private/postgresql.key
POSTGRES_SSL_CA_PATH=/etc/ssl/certs/ca.crt
```

#### Optimisation des performances
```env
# Pool de connexions
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_MIN_CONNECTIONS=5
POSTGRES_IDLE_TIMEOUT=30000

# Optimisation mémoire
POSTGRES_SHARED_BUFFERS=256MB
POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
```

### 2. Redis

#### Configuration de base
```env
REDIS_HOST=your-redis-cluster.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=VotreRedisPasswordSécurisé123!
REDIS_DB=0
```

#### Configuration cluster (Production recommandée)
```env
REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379
REDIS_SENTINEL_PASSWORD=sentinel_password
```

#### Configuration TLS
```env
REDIS_TLS_ENABLED=true
REDIS_TLS_CERT_PATH=/etc/redis/tls/redis.crt
REDIS_TLS_KEY_PATH=/etc/redis/tls/redis.key
```

### 3. AWS Services

#### Credentials et région
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYzEXAMPLEKEY
```

#### RDS Configuration
```env
RDS_INSTANCE_IDENTIFIER=bmad-studio-db-prod
RDS_INSTANCE_CLASS=db.r5.large
RDS_REPLICA_IDENTIFIER=bmad-studio-db-replica
```

#### S3 pour les sauvegardes
```env
S3_BACKUP_BUCKET=bmad-studio-backups-prod-us-east-1
S3_BACKUP_REGION=us-east-1
```

### 4. HashiCorp Vault

#### Configuration de base
```env
VAULT_ADDR=https://vault.votre-domaine.com:8200
VAULT_TOKEN=hvs.CAESIB1JliweHcNjF... # Token d'accès
VAULT_NAMESPACE=bmad-studio
```

#### Authentification Kubernetes
```env
VAULT_AUTH_METHOD=kubernetes
VAULT_ROLE=bmad-studio-service-account
VAULT_MOUNT_PATH=secret/bmad-studio
```

### 5. Monitoring - Prometheus & Grafana

#### Prometheus
```env
PROMETHEUS_URL=https://prometheus.votre-domaine.com
PROMETHEUS_RETENTION=30d
PROMETHEUS_SCRAPE_INTERVAL=15s
PROMETHEUS_METRICS_PASSWORD=metrics_access_password
```

#### Grafana
```env
GRAFANA_URL=https://grafana.votre-domaine.com
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=VotrePasswordGrafana123!
GRAFANA_SECRET_KEY=clé_secrète_pour_cookies_32_chars
```

### 6. Alerting

#### AlertManager
```env
ALERTMANAGER_URL=https://alertmanager.votre-domaine.com
```

#### SMTP pour les alertes
```env
ALERTMANAGER_SMTP_HOST=smtp.gmail.com
ALERTMANAGER_SMTP_PORT=587
ALERTMANAGER_SMTP_USER=alerts@votre-domaine.com
ALERTMANAGER_SMTP_PASSWORD=mot_de_passe_application_gmail
```

#### Slack
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/24charstring
SLACK_CHANNEL=#alerts-production
```

## Sécurité et bonnes pratiques

### 🔒 Génération de clés sécurisées

#### JWT Secret (minimum 32 caractères)
```bash
# Générer une clé JWT
openssl rand -base64 32
```

#### Encryption Key (exactement 32 octets)
```bash
# Générer une clé de chiffrement
openssl rand -hex 32
```

#### Mots de passe forts
```bash
# Générer un mot de passe fort
openssl rand -base64 24
```

### 🛡️ Bonnes pratiques de sécurité

1. **Ne jamais commiter le fichier `.env`** dans Git
   ```gitignore
   .env
   .env.local
   .env.production
   ```

2. **Utiliser des secrets différents par environnement**
   - Développement : clés de test
   - Staging : clés intermédiaires
   - Production : clés robustes et uniques

3. **Rotation régulière des secrets**
   - JWT secrets : tous les 90 jours
   - Mots de passe de base : tous les 60 jours
   - Clés API : tous les 30 jours

4. **Utiliser Vault pour la production**
   ```env
   # Au lieu de stocker directement
   DATABASE_PASSWORD=password123
   
   # Utiliser une référence Vault
   VAULT_DATABASE_PATH=secret/bmad-studio/database
   ```

### 🔐 Configuration SSL/TLS

Pour la production, activez SSL partout :

```env
# PostgreSQL
POSTGRES_SSL_MODE=require

# Redis
REDIS_TLS_ENABLED=true

# Vault
VAULT_SKIP_VERIFY=false

# Application
TLS_MIN_VERSION=1.2
```

## Configuration par environnement

### 🟢 Development

```env
NODE_ENV=development
DEBUG_MODE=true
VERBOSE_LOGGING=true

# Base de données locale
POSTGRES_HOST=localhost
POSTGRES_DB=bmad_studio_dev

# Pas de SSL requis
POSTGRES_SSL_MODE=disable
REDIS_TLS_ENABLED=false

# Monitoring léger
PROMETHEUS_SCRAPE_INTERVAL=30s
```

### 🟡 Staging

```env
NODE_ENV=staging
DEBUG_MODE=false
VERBOSE_LOGGING=true

# Base de données partagée mais isolée
POSTGRES_DB=bmad_studio_staging
POSTGRES_SSL_MODE=prefer

# SSL recommandé
REDIS_TLS_ENABLED=true

# Monitoring complet
PROMETHEUS_RETENTION=7d
```

### 🔴 Production

```env
NODE_ENV=production
DEBUG_MODE=false
VERBOSE_LOGGING=false

# Base de données haute disponibilité
POSTGRES_SSL_MODE=require
RDS_MULTI_AZ=true

# Toutes les sécurités activées
REDIS_TLS_ENABLED=true
VAULT_SKIP_VERIFY=false

# Monitoring maximum
PROMETHEUS_RETENTION=30d
BACKUP_RETENTION_DAYS=30
```

## Intégrations tierces

### Stripe (Paiements)
```env
STRIPE_PUBLISHABLE_KEY=pk_live_... # Pour le frontend
STRIPE_SECRET_KEY=sk_live_...      # Pour le backend
STRIPE_WEBHOOK_SECRET=whsec_...    # Pour vérifier les webhooks
```

### SendGrid (Emails)
```env
SENDGRID_API_KEY=SG.abc123...
SENDGRID_FROM_EMAIL=noreply@votre-domaine.com
SENDGRID_FROM_NAME=BMAD Studio
```

### OAuth (Authentification sociale)
```env
# Google
GOOGLE_CLIENT_ID=123456.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123

# GitHub
GITHUB_CLIENT_ID=abc123
GITHUB_CLIENT_SECRET=def456
```

## CI/CD Configuration

### GitHub Actions

```env
# Registre Docker
DOCKER_REGISTRY=your-registry.com
DOCKER_USERNAME=ci-user
DOCKER_PASSWORD=registry_password

# Kubernetes
K8S_CLUSTER=production-cluster
KUBE_CONFIG_DATA=base64_encoded_config

# Secrets pour les pipelines
VAULT_GITHUB_TOKEN=ghp_token_for_ci
GITHUB_WEBHOOK_SECRET=webhook_secret
```

## Dépannage

### Problèmes courants

#### 1. Erreur de connexion PostgreSQL
```
Error: ECONNREFUSED 127.0.0.1:5432
```
**Solutions :**
- Vérifiez que PostgreSQL est démarré
- Vérifiez `POSTGRES_HOST` et `POSTGRES_PORT`
- Testez la connexion : `psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB`

#### 2. Erreur Redis connexion
```
Error: Redis connection refused
```
**Solutions :**
- Vérifiez que Redis est démarré
- Testez : `redis-cli -h $REDIS_HOST -p $REDIS_PORT ping`
- Vérifiez le mot de passe : `redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD ping`

#### 3. Erreur JWT
```
Error: JWT malformed
```
**Solutions :**
- Vérifiez que `JWT_SECRET` fait au moins 32 caractères
- Régénérez la clé : `openssl rand -base64 32`

#### 4. Erreur Vault
```
Error: Vault connection failed
```
**Solutions :**
- Vérifiez `VAULT_ADDR`
- Testez : `vault status`
- Renouvelez le token : `vault token renew`

### Validation de la configuration

#### Script de validation
```bash
#!/bin/bash
# validate-config.sh

echo "🔍 Validation de la configuration..."

# Vérifier les variables obligatoires
required_vars=(
  "NODE_ENV"
  "POSTGRES_PASSWORD"
  "REDIS_PASSWORD"
  "JWT_SECRET"
  "ENCRYPTION_KEY"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Variable manquante: $var"
    exit 1
  else
    echo "✅ $var configuré"
  fi
done

# Vérifier la longueur des secrets
if [ ${#JWT_SECRET} -lt 32 ]; then
  echo "❌ JWT_SECRET trop court (minimum 32 caractères)"
  exit 1
fi

if [ ${#ENCRYPTION_KEY} -ne 32 ]; then
  echo "❌ ENCRYPTION_KEY doit faire exactement 32 caractères"
  exit 1
fi

echo "✅ Configuration validée avec succès!"
```

#### Tests de connectivité
```bash
#!/bin/bash
# test-connectivity.sh

echo "🔗 Test des connexions..."

# Test PostgreSQL
pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER
if [ $? -eq 0 ]; then
  echo "✅ PostgreSQL accessible"
else
  echo "❌ PostgreSQL inaccessible"
fi

# Test Redis
redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping
if [ $? -eq 0 ]; then
  echo "✅ Redis accessible"
else
  echo "❌ Redis inaccessible"
fi

# Test Vault (si configuré)
if [ ! -z "$VAULT_ADDR" ]; then
  vault status > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "✅ Vault accessible"
  else
    echo "❌ Vault inaccessible"
  fi
fi
```

## Ressources utiles

- [Documentation PostgreSQL](https://www.postgresql.org/docs/)
- [Guide Redis](https://redis.io/documentation)
- [HashiCorp Vault](https://www.vaultproject.io/docs)
- [Prometheus Configuration](https://prometheus.io/docs/prometheus/latest/configuration/)
- [AWS RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)

## Support

Pour toute question sur la configuration :

- 📧 Email : devops@bmadstudio.com
- 💬 Slack : #devops-support
- 📚 Wiki : https://wiki.bmadstudio.com/config

---

*Dernière mise à jour : 2025-09-07*  
*Version du guide : 2.1.0*