#!/bin/bash

# Database Maintenance Scripts
# BMAD Studio Template - Automated Maintenance Tasks

set -euo pipefail

# Configuration
LOG_FILE="/var/log/bmad-studio/maintenance.log"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-bmad_studio_db}"
POSTGRES_USER="${POSTGRES_USER:-bmad_admin}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"

# Thresholds
MAX_CONNECTIONS_THRESHOLD=150
DISK_USAGE_THRESHOLD=85
MEMORY_USAGE_THRESHOLD=90
SLOW_QUERY_THRESHOLD=5000  # milliseconds

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send Slack notification
send_slack_notification() {
    local message="$1"
    local color="${2:-warning}"
    
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK" || true
    fi
}

# PostgreSQL maintenance functions
postgresql_vacuum_analyze() {
    log "Starting PostgreSQL VACUUM ANALYZE"
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Get list of tables that need maintenance
    local tables=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" -t -c "
        SELECT schemaname||'.'||tablename 
        FROM pg_stat_user_tables 
        WHERE n_dead_tup > n_live_tup * 0.1 
           OR n_dead_tup > 1000
        ORDER BY n_dead_tup DESC;
    ")
    
    if [[ -n "$tables" ]]; then
        echo "$tables" | while IFS= read -r table; do
            if [[ -n "$table" && "$table" != " " ]]; then
                log "Running VACUUM ANALYZE on $table"
                psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
                    -d "$POSTGRES_DB" -c "VACUUM ANALYZE $table;" || log "Warning: VACUUM ANALYZE failed for $table"
            fi
        done
    else
        log "No tables require VACUUM ANALYZE"
    fi
    
    unset PGPASSWORD
    log "PostgreSQL VACUUM ANALYZE completed"
}

postgresql_reindex() {
    log "Starting PostgreSQL REINDEX for bloated indexes"
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Find bloated indexes (more than 20% bloat)
    local indexes=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" -t -c "
        SELECT schemaname||'.'||indexname
        FROM pg_stat_user_indexes 
        WHERE idx_scan = 0 AND schemaname NOT IN ('information_schema', 'pg_catalog')
        LIMIT 10;
    ")
    
    if [[ -n "$indexes" ]]; then
        echo "$indexes" | while IFS= read -r index; do
            if [[ -n "$index" && "$index" != " " ]]; then
                log "Reindexing $index"
                psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
                    -d "$POSTGRES_DB" -c "REINDEX INDEX CONCURRENTLY $index;" || log "Warning: REINDEX failed for $index"
            fi
        done
    else
        log "No indexes require reindexing"
    fi
    
    unset PGPASSWORD
    log "PostgreSQL REINDEX completed"
}

postgresql_cleanup_expired_sessions() {
    log "Cleaning up expired PostgreSQL sessions"
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    local cleaned_sessions=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" -t -c "SELECT app.cleanup_expired_sessions();")
    
    log "Cleaned $cleaned_sessions expired sessions"
    
    unset PGPASSWORD
}

postgresql_analyze_slow_queries() {
    log "Analyzing PostgreSQL slow queries"
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # Get slow queries from pg_stat_statements
    local slow_queries=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" -t -c "
        SELECT count(*) 
        FROM pg_stat_statements 
        WHERE mean_time > $SLOW_QUERY_THRESHOLD;
    " 2>/dev/null || echo "0")
    
    if [[ "$slow_queries" -gt 0 ]]; then
        log "Found $slow_queries slow queries (>${SLOW_QUERY_THRESHOLD}ms)"
        send_slack_notification "PostgreSQL: Found $slow_queries slow queries requiring optimization" "warning"
        
        # Log top 5 slow queries
        psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
            -d "$POSTGRES_DB" -c "
            SELECT substring(query, 1, 100) as query_snippet, 
                   calls, mean_time, total_time 
            FROM pg_stat_statements 
            WHERE mean_time > $SLOW_QUERY_THRESHOLD 
            ORDER BY mean_time DESC 
            LIMIT 5;
        " >> "$LOG_FILE" 2>/dev/null || true
    fi
    
    unset PGPASSWORD
}

# Redis maintenance functions
redis_memory_optimization() {
    log "Starting Redis memory optimization"
    
    local redis_auth=""
    if [[ -n "${REDIS_PASSWORD:-}" ]]; then
        redis_auth="-a $REDIS_PASSWORD"
    fi
    
    # Get Redis memory usage
    local used_memory=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r\n')
    local max_memory=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth CONFIG GET maxmemory | tail -1)
    
    log "Redis memory usage: $used_memory (max: $max_memory)"
    
    # Force garbage collection
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth DEBUG JEMALLOC purge || true
    
    # Get expired keys count
    local expired_keys=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth INFO stats | grep expired_keys | cut -d: -f2 | tr -d '\r\n')
    log "Redis expired keys: $expired_keys"
    
    # Trigger active expiration
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth DEBUG ACTIVE-EXPIRE || true
    
    log "Redis memory optimization completed"
}

redis_key_analysis() {
    log "Analyzing Redis key patterns"
    
    local redis_auth=""
    if [[ -n "${REDIS_PASSWORD:-}" ]]; then
        redis_auth="-a $REDIS_PASSWORD"
    fi
    
    # Get key statistics by pattern
    local total_keys=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth DBSIZE)
    log "Total Redis keys: $total_keys"
    
    # Analyze key patterns (sample first 1000 keys)
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth --scan --count 1000 | \
        head -1000 | \
        sed 's/:.*$//' | \
        sort | uniq -c | sort -nr | head -10 > /tmp/redis_key_patterns.txt
    
    log "Top Redis key patterns:"
    cat /tmp/redis_key_patterns.txt | while read line; do
        log "  $line"
    done
    
    rm -f /tmp/redis_key_patterns.txt
}

# System monitoring functions
check_database_connections() {
    log "Checking database connection counts"
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    local active_connections=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';")
    
    local total_connections=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" -t -c "SELECT count(*) FROM pg_stat_activity;")
    
    log "PostgreSQL connections: $total_connections total, $active_connections active"
    
    if [[ "$total_connections" -gt "$MAX_CONNECTIONS_THRESHOLD" ]]; then
        send_slack_notification "PostgreSQL: High connection count ($total_connections)" "warning"
    fi
    
    unset PGPASSWORD
}

check_disk_usage() {
    log "Checking disk usage"
    
    local disk_usage=$(df /var/lib/postgresql | tail -1 | awk '{print $5}' | sed 's/%//')
    log "PostgreSQL disk usage: ${disk_usage}%"
    
    if [[ "$disk_usage" -gt "$DISK_USAGE_THRESHOLD" ]]; then
        send_slack_notification "PostgreSQL: High disk usage (${disk_usage}%)" "danger"
    fi
    
    local redis_disk_usage=$(df /var/lib/redis | tail -1 | awk '{print $5}' | sed 's/%//' 2>/dev/null || echo "0")
    if [[ "$redis_disk_usage" -gt 0 ]]; then
        log "Redis disk usage: ${redis_disk_usage}%"
        if [[ "$redis_disk_usage" -gt "$DISK_USAGE_THRESHOLD" ]]; then
            send_slack_notification "Redis: High disk usage (${redis_disk_usage}%)" "danger"
        fi
    fi
}

generate_health_report() {
    log "Generating database health report"
    
    local report_file="/tmp/db_health_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
BMAD Studio Database Health Report
Generated: $(date)
=====================================

PostgreSQL Status:
EOF
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    # PostgreSQL version and uptime
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" -c "SELECT version();" >> "$report_file" 2>/dev/null || echo "PostgreSQL connection failed" >> "$report_file"
    
    # Database sizes
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
        -d "$POSTGRES_DB" -c "
        SELECT datname, pg_size_pretty(pg_database_size(datname)) as size
        FROM pg_database 
        WHERE datistemplate = false
        ORDER BY pg_database_size(datname) DESC;
    " >> "$report_file" 2>/dev/null || true
    
    unset PGPASSWORD
    
    cat >> "$report_file" << EOF

Redis Status:
EOF
    
    local redis_auth=""
    if [[ -n "${REDIS_PASSWORD:-}" ]]; then
        redis_auth="-a $REDIS_PASSWORD"
    fi
    
    # Redis info
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth INFO server | head -20 >> "$report_file" 2>/dev/null || echo "Redis connection failed" >> "$report_file"
    
    log "Health report generated: $report_file"
    
    # Send report if configured
    if [[ -n "${HEALTH_REPORT_EMAIL:-}" ]]; then
        mail -s "BMAD Studio Database Health Report" "$HEALTH_REPORT_EMAIL" < "$report_file" || true
    fi
    
    # Clean up old reports
    find /tmp -name "db_health_report_*.txt" -mtime +7 -delete 2>/dev/null || true
}

# Main maintenance function
run_maintenance() {
    local task="${1:-all}"
    local start_time=$(date +%s)
    
    log "Starting BMAD Studio database maintenance (task: $task)"
    send_slack_notification "Starting BMAD Studio database maintenance (task: $task)" "warning"
    
    case "$task" in
        "postgresql"|"all")
            postgresql_vacuum_analyze
            postgresql_cleanup_expired_sessions
            postgresql_analyze_slow_queries
            check_database_connections
            ;;& # fallthrough
        "redis"|"all")
            redis_memory_optimization
            redis_key_analysis
            ;;& # fallthrough
        "monitoring"|"all")
            check_disk_usage
            generate_health_report
            ;;
        "reindex")
            postgresql_reindex
            ;;
        *)
            log "Invalid maintenance task: $task"
            echo "Usage: $0 [all|postgresql|redis|monitoring|reindex]"
            exit 1
            ;;
    esac
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local message="BMAD Studio database maintenance completed in ${duration}s"
    
    log "$message"
    send_slack_notification "$message" "good"
}

# Handle script arguments
run_maintenance "${1:-all}"