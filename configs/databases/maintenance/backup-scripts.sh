#!/bin/bash

# PostgreSQL and Redis Backup Scripts
# BMAD Studio Template - Database Maintenance

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/bmad-studio}"
S3_BUCKET="${S3_BUCKET:-bmad-studio-db-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-bmad_studio_db}"
POSTGRES_USER="${POSTGRES_USER:-bmad_admin}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Logging
LOG_FILE="/var/log/bmad-studio/backup.log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send Slack notification
send_slack_notification() {
    local message="$1"
    local color="$2"
    
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK" || true
    fi
}

# Function to create backup directory structure
create_backup_structure() {
    local backup_date="$1"
    mkdir -p "$BACKUP_DIR/postgresql/$backup_date"
    mkdir -p "$BACKUP_DIR/redis/$backup_date"
    mkdir -p "$BACKUP_DIR/logs/$backup_date"
}

# PostgreSQL backup function
backup_postgresql() {
    local backup_date="$1"
    local backup_type="${2:-full}"
    local backup_path="$BACKUP_DIR/postgresql/$backup_date"
    
    log "Starting PostgreSQL $backup_type backup"
    
    # Set PostgreSQL password
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    case "$backup_type" in
        "full")
            # Full database backup
            pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
                --verbose --clean --if-exists --create \
                --format=custom --compress=9 \
                "$POSTGRES_DB" > "$backup_path/full_backup.dump"
            
            # Schema-only backup
            pg_dump -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
                --schema-only --verbose "$POSTGRES_DB" > "$backup_path/schema_backup.sql"
            
            # Globals backup (users, roles, etc.)
            pg_dumpall -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" \
                --globals-only > "$backup_path/globals_backup.sql"
            ;;
        "incremental")
            # WAL archive backup (if configured)
            if [[ -d "/var/lib/postgresql/archive" ]]; then
                rsync -av /var/lib/postgresql/archive/ "$backup_path/wal_archive/"
            fi
            ;;
    esac
    
    # Compress backups
    cd "$backup_path"
    tar -czf "postgresql_${backup_type}_$(date +%Y%m%d_%H%M%S).tar.gz" *.dump *.sql wal_archive/ 2>/dev/null || true
    
    # Clean up individual files
    rm -f *.dump *.sql
    rm -rf wal_archive/
    
    log "PostgreSQL $backup_type backup completed"
    unset PGPASSWORD
}

# Redis backup function
backup_redis() {
    local backup_date="$1"
    local backup_path="$BACKUP_DIR/redis/$backup_date"
    
    log "Starting Redis backup"
    
    # Redis AUTH if password is set
    local redis_auth=""
    if [[ -n "${REDIS_PASSWORD:-}" ]]; then
        redis_auth="-a $REDIS_PASSWORD"
    fi
    
    # Create Redis backup using BGSAVE
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth BGSAVE
    
    # Wait for background save to complete
    while [[ $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth LASTSAVE) -eq $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth LASTSAVE) ]]; do
        sleep 1
    done
    
    # Copy RDB file
    local redis_dir=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth CONFIG GET dir | tail -1)
    local redis_file=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth CONFIG GET dbfilename | tail -1)
    
    if [[ -f "$redis_dir/$redis_file" ]]; then
        cp "$redis_dir/$redis_file" "$backup_path/redis_$(date +%Y%m%d_%H%M%S).rdb"
        
        # Compress Redis backup
        gzip "$backup_path/redis_$(date +%Y%m%d_%H%M%S).rdb"
        log "Redis backup completed"
    else
        log "ERROR: Redis RDB file not found at $redis_dir/$redis_file"
        return 1
    fi
    
    # Backup Redis configuration
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" $redis_auth CONFIG GET '*' > "$backup_path/redis_config_$(date +%Y%m%d_%H%M%S).txt"
}

# Function to upload backups to S3
upload_to_s3() {
    local backup_date="$1"
    local backup_path="$BACKUP_DIR/$backup_date"
    
    log "Uploading backups to S3"
    
    # Upload PostgreSQL backups
    if [[ -d "$BACKUP_DIR/postgresql/$backup_date" ]]; then
        aws s3 sync "$BACKUP_DIR/postgresql/$backup_date/" "s3://$S3_BUCKET/postgresql/$backup_date/" \
            --storage-class STANDARD_IA --delete
    fi
    
    # Upload Redis backups
    if [[ -d "$BACKUP_DIR/redis/$backup_date" ]]; then
        aws s3 sync "$BACKUP_DIR/redis/$backup_date/" "s3://$S3_BUCKET/redis/$backup_date/" \
            --storage-class STANDARD_IA --delete
    fi
    
    log "S3 upload completed"
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Starting cleanup of backups older than $RETENTION_DAYS days"
    
    # Local cleanup
    find "$BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    
    # S3 cleanup (list and delete old objects)
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d)
    
    # Cleanup PostgreSQL backups in S3
    aws s3api list-objects-v2 --bucket "$S3_BUCKET" --prefix "postgresql/" \
        --query "Contents[?LastModified<='$cutoff_date'].Key" --output text | \
        tr '\t' '\n' | while read -r key; do
            if [[ -n "$key" ]]; then
                aws s3 rm "s3://$S3_BUCKET/$key"
            fi
        done
    
    # Cleanup Redis backups in S3
    aws s3api list-objects-v2 --bucket "$S3_BUCKET" --prefix "redis/" \
        --query "Contents[?LastModified<='$cutoff_date'].Key" --output text | \
        tr '\t' '\n' | while read -r key; do
            if [[ -n "$key" ]]; then
                aws s3 rm "s3://$S3_BUCKET/$key"
            fi
        done
    
    log "Cleanup completed"
}

# Function to verify backup integrity
verify_backups() {
    local backup_date="$1"
    
    log "Verifying backup integrity"
    
    # Verify PostgreSQL backup
    local pg_backup_file=$(find "$BACKUP_DIR/postgresql/$backup_date" -name "*.tar.gz" -type f | head -1)
    if [[ -f "$pg_backup_file" ]]; then
        if tar -tzf "$pg_backup_file" >/dev/null 2>&1; then
            log "PostgreSQL backup integrity verified"
        else
            log "ERROR: PostgreSQL backup integrity check failed"
            return 1
        fi
    fi
    
    # Verify Redis backup
    local redis_backup_file=$(find "$BACKUP_DIR/redis/$backup_date" -name "*.rdb.gz" -type f | head -1)
    if [[ -f "$redis_backup_file" ]]; then
        if gunzip -t "$redis_backup_file" 2>/dev/null; then
            log "Redis backup integrity verified"
        else
            log "ERROR: Redis backup integrity check failed"
            return 1
        fi
    fi
}

# Main backup function
main_backup() {
    local backup_type="${1:-full}"
    local backup_date=$(date +%Y-%m-%d)
    local start_time=$(date +%s)
    
    log "Starting BMAD Studio database backup (type: $backup_type)"
    send_slack_notification "Starting BMAD Studio database backup (type: $backup_type)" "warning"
    
    # Create backup structure
    create_backup_structure "$backup_date"
    
    # Perform backups
    if backup_postgresql "$backup_date" "$backup_type" && backup_redis "$backup_date"; then
        # Verify backups
        if verify_backups "$backup_date"; then
            # Upload to S3
            if upload_to_s3 "$backup_date"; then
                # Cleanup old backups
                cleanup_old_backups
                
                local end_time=$(date +%s)
                local duration=$((end_time - start_time))
                local message="BMAD Studio database backup completed successfully in ${duration}s"
                
                log "$message"
                send_slack_notification "$message" "good"
            else
                log "ERROR: S3 upload failed"
                send_slack_notification "BMAD Studio database backup: S3 upload failed" "danger"
                exit 1
            fi
        else
            log "ERROR: Backup verification failed"
            send_slack_notification "BMAD Studio database backup: Verification failed" "danger"
            exit 1
        fi
    else
        log "ERROR: Database backup failed"
        send_slack_notification "BMAD Studio database backup failed" "danger"
        exit 1
    fi
}

# Handle script arguments
case "${1:-full}" in
    "full")
        main_backup "full"
        ;;
    "incremental")
        main_backup "incremental"
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    *)
        echo "Usage: $0 [full|incremental|cleanup]"
        exit 1
        ;;
esac