# BMAD Studio Template - Database Configuration Guide

## Overview

This directory contains comprehensive database configurations for PostgreSQL and Redis, designed for high availability, performance, and security in the BMAD Studio Template environment.

## Architecture

### PostgreSQL Setup
- **Primary Database**: High-performance RDS instance with automated backups
- **Read Replica**: Dedicated read-only instance for analytics and reporting
- **Connection Pooling**: Optimized connection management
- **Security**: SSL/TLS encryption, ACL-based access control
- **Monitoring**: Performance Insights, custom metrics, slow query tracking

### Redis Setup
- **Cluster Mode**: Multi-node Redis cluster for high availability
- **Sentinel**: Automatic failover and monitoring
- **Security**: ACL users, TLS encryption, auth tokens
- **Memory Management**: LRU eviction, persistence configuration
- **Performance**: Optimized for caching and session management

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp configs/databases/environment/.env.example .env

# Update with your actual values
nano .env
```

### 2. Infrastructure Deployment

```bash
# Initialize Terraform
cd infra/
terraform init

# Plan deployment
terraform plan -var-file="environments/production.tfvars"

# Deploy infrastructure
terraform apply -var-file="environments/production.tfvars"
```

### 3. Database Initialization

```bash
# Initialize PostgreSQL schema
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -f configs/databases/migrations/init-database.sql

# Verify Redis configuration
redis-cli -h $REDIS_HOST -p $REDIS_PORT --tls --cert $REDIS_TLS_CERT --key $REDIS_TLS_KEY --cacert $REDIS_TLS_CA ping
```

### 4. Monitoring Setup

```bash
# Start monitoring exporters
docker-compose -f configs/databases/monitoring/prometheus-exporters.yml up -d

# Import Grafana dashboard
curl -X POST http://admin:$GRAFANA_PASSWORD@grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @configs/databases/monitoring/grafana-dashboard.json
```

## Directory Structure

```
configs/databases/
├── postgresql/
│   ├── postgresql.conf          # PostgreSQL server configuration
│   ├── pg_hba.conf              # Client authentication
│   ├── recovery.conf            # Replication and recovery
│   └── backup-config.yaml       # Backup strategy
├── redis/
│   ├── redis.conf               # Redis server configuration
│   ├── redis-cluster.conf       # Cluster configuration
│   ├── redis-sentinel.conf      # Sentinel configuration
│   └── users.acl                # Access control lists
├── migrations/
│   └── init-database.sql        # Initial schema setup
├── maintenance/
│   ├── backup-scripts.sh        # Automated backup scripts
│   └── maintenance-scripts.sh   # Database maintenance
├── monitoring/
│   ├── prometheus-exporters.yml # Monitoring services
│   ├── postgres-queries.yaml    # Custom PostgreSQL metrics
│   ├── blackbox-config.yml      # Service availability probes
│   └── grafana-dashboard.json   # Monitoring dashboard
└── environment/
    └── .env.example             # Environment variables template
```

## Configuration Files

### PostgreSQL Configuration (`postgresql/postgresql.conf`)

Key optimizations:
- **Memory Settings**: `shared_buffers=256MB`, `effective_cache_size=1GB`
- **WAL Configuration**: Streaming replication, archive mode
- **Performance**: Query planner optimizations, autovacuum tuning
- **Security**: SSL enforcement, connection logging
- **Monitoring**: Performance Insights, slow query logging

### Redis Configuration (`redis/redis.conf`)

Key features:
- **Memory Management**: `maxmemory=2gb`, `allkeys-lru` eviction
- **Persistence**: AOF + RDB snapshots
- **Security**: TLS encryption, ACL users, renamed commands
- **Performance**: Lazy freeing, optimized data structures
- **Clustering**: Multi-node setup with automatic failover

### Terraform Infrastructure (`infra/databases.tf`)

Resources created:
- **RDS PostgreSQL**: Primary + replica instances
- **ElastiCache Redis**: Replication group with clustering
- **Security Groups**: Network access controls
- **KMS Keys**: Encryption key management
- **CloudWatch**: Logging and monitoring
- **SNS Topics**: Alert notifications

## Security Features

### PostgreSQL Security
- **SSL/TLS Encryption**: Required for all connections
- **User Management**: Role-based access control
- **Audit Logging**: Complete audit trail
- **Network Security**: VPC isolation, security groups
- **Data Encryption**: At-rest and in-transit encryption

### Redis Security
- **ACL Users**: Granular permission control
- **TLS Encryption**: Secure client-server communication
- **Auth Tokens**: Token-based authentication
- **Command Renaming**: Critical commands disabled/renamed
- **Network Isolation**: Private subnet deployment

## Backup Strategy

### PostgreSQL Backups
- **Full Backups**: Weekly (Sunday 2 AM)
- **Incremental**: Daily (Monday-Saturday 3 AM)
- **WAL Archiving**: Continuous
- **Retention**: 30 days full, 7 days incremental
- **Verification**: Automated integrity checks
- **Destinations**: S3 primary, local secondary

### Redis Backups
- **RDB Snapshots**: Daily
- **AOF Persistence**: Continuous
- **Cluster Backup**: All nodes synchronized
- **Retention**: 7 days
- **Compression**: Gzip compression enabled

### Backup Execution

```bash
# Manual full backup
./configs/databases/maintenance/backup-scripts.sh full

# Manual incremental backup
./configs/databases/maintenance/backup-scripts.sh incremental

# Cleanup old backups
./configs/databases/maintenance/backup-scripts.sh cleanup
```

## Monitoring and Alerting

### Metrics Collected
- **PostgreSQL**: Connections, query performance, replication lag, locks
- **Redis**: Memory usage, key statistics, cluster health, latency
- **System**: CPU, memory, disk, network
- **Custom**: Application-specific business metrics

### Alert Rules
- **Critical**: Database down, disk space low, replication failure
- **Warning**: High connections, slow queries, memory usage
- **Info**: Backup completion, maintenance events

### Dashboard Access
- **Grafana URL**: `http://grafana:3000`
- **Default Login**: `admin` / `${GRAFANA_ADMIN_PASSWORD}`
- **Dashboard**: "BMAD Studio - Database Monitoring"

## Maintenance Operations

### PostgreSQL Maintenance

```bash
# Run complete maintenance
./configs/databases/maintenance/maintenance-scripts.sh postgresql

# Vacuum and analyze tables
./configs/databases/maintenance/maintenance-scripts.sh postgresql vacuum

# Reindex bloated indexes
./configs/databases/maintenance/maintenance-scripts.sh reindex
```

### Redis Maintenance

```bash
# Redis memory optimization
./configs/databases/maintenance/maintenance-scripts.sh redis

# Key pattern analysis
redis-cli --scan --count 1000 | head -1000 | cut -d: -f1 | sort | uniq -c | sort -nr
```

### Health Checks

```bash
# Generate health report
./configs/databases/maintenance/maintenance-scripts.sh monitoring

# Check specific components
curl http://localhost:9187/metrics  # PostgreSQL exporter
curl http://localhost:9121/metrics  # Redis exporter
curl http://localhost:9115/metrics  # Blackbox exporter
```

## Performance Optimization

### PostgreSQL Tuning
- **Connection Pooling**: PgBouncer recommended for high-traffic applications
- **Query Optimization**: Regular ANALYZE, proper indexing
- **Memory Configuration**: Adjusted for workload patterns
- **Vacuum Strategy**: Automated with custom thresholds

### Redis Optimization
- **Memory Policy**: LRU eviction for cache workloads
- **Pipeline Operations**: Batch operations for better throughput
- **Key Expiration**: TTL settings for session data
- **Cluster Scaling**: Horizontal scaling with consistent hashing

## Troubleshooting

### Common Issues

#### PostgreSQL Connection Issues
```bash
# Check connection limit
SELECT count(*) FROM pg_stat_activity;
SELECT setting FROM pg_settings WHERE name = 'max_connections';

# Check for long-running queries
SELECT pid, usename, query, state, now() - query_start AS duration 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY duration DESC;
```

#### Redis Memory Issues
```bash
# Check memory usage
redis-cli INFO memory

# Analyze memory by key type
redis-cli --bigkeys

# Check eviction statistics
redis-cli INFO stats | grep evicted
```

### Log Analysis
```bash
# PostgreSQL slow queries
grep "duration:" /var/log/postgresql/postgresql-*.log | tail -20

# Redis slow log
redis-cli SLOWLOG GET 10

# System resources
df -h  # Disk usage
free -m  # Memory usage
```

## Best Practices

### Development
- Use connection pooling libraries (e.g., HikariCP for Java, asyncpg for Python)
- Implement proper error handling and retry logic
- Use read replicas for analytics workloads
- Cache frequently accessed data in Redis
- Set appropriate TTL values for cached data

### Production
- Monitor key metrics continuously
- Implement automated failover procedures
- Regular backup testing and restore drills
- Capacity planning based on growth trends
- Security audit and compliance checks

### Maintenance
- Schedule maintenance windows during low-traffic periods
- Test configuration changes in staging first
- Keep database software updated
- Monitor and tune performance regularly
- Document all configuration changes

## Support and Troubleshooting

For database-related issues:

1. **Check Monitoring**: Review Grafana dashboards for anomalies
2. **Review Logs**: Check CloudWatch logs for errors
3. **Run Health Checks**: Execute maintenance scripts
4. **Contact DevOps**: Slack #database-alerts channel

## Contributing

When modifying database configurations:

1. Test in development environment first
2. Update relevant documentation
3. Follow security best practices
4. Update monitoring and alerting rules
5. Create pull request with detailed description

## Version History

- **v1.0.0**: Initial database configuration
- **v1.1.0**: Added Redis cluster support
- **v1.2.0**: Enhanced monitoring and alerting
- **v2.0.0**: AWS RDS/ElastiCache integration
- **v2.1.0**: Advanced security features
- **v2.2.0**: Complete monitoring stack integration

---

**Last Updated**: 2025-09-07  
**Maintained By**: BMAD Studio DevOps Team  
**Documentation Version**: 2.2.0