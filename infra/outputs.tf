# Outputs for BMAD Studio Template Database Infrastructure
# Database connection information and endpoints

# PostgreSQL Outputs
output "postgresql_endpoint" {
  description = "PostgreSQL primary instance endpoint"
  value       = aws_db_instance.postgresql_primary.endpoint
}

output "postgresql_replica_endpoint" {
  description = "PostgreSQL read replica endpoint"
  value       = aws_db_instance.postgresql_replica.endpoint
}

output "postgresql_port" {
  description = "PostgreSQL port"
  value       = aws_db_instance.postgresql_primary.port
}

output "postgresql_database_name" {
  description = "PostgreSQL database name"
  value       = aws_db_instance.postgresql_primary.db_name
}

output "postgresql_username" {
  description = "PostgreSQL master username"
  value       = aws_db_instance.postgresql_primary.username
  sensitive   = true
}

output "postgresql_arn" {
  description = "PostgreSQL instance ARN"
  value       = aws_db_instance.postgresql_primary.arn
}

output "postgresql_hosted_zone_id" {
  description = "PostgreSQL instance hosted zone ID"
  value       = aws_db_instance.postgresql_primary.hosted_zone_id
}

# Redis Outputs
output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = aws_elasticache_replication_group.redis_cluster.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Redis cluster reader endpoint"
  value       = aws_elasticache_replication_group.redis_cluster.reader_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.redis_cluster.port
}

output "redis_arn" {
  description = "Redis cluster ARN"
  value       = aws_elasticache_replication_group.redis_cluster.arn
}

output "redis_member_clusters" {
  description = "Redis cluster member nodes"
  value       = aws_elasticache_replication_group.redis_cluster.member_clusters
}

# Security Group Outputs
output "postgresql_security_group_id" {
  description = "PostgreSQL security group ID"
  value       = aws_security_group.postgresql_sg.id
}

output "redis_security_group_id" {
  description = "Redis security group ID"
  value       = aws_security_group.redis_sg.id
}

output "bastion_security_group_id" {
  description = "Bastion host security group ID"
  value       = aws_security_group.bastion_sg.id
}

# Subnet Group Outputs
output "postgresql_subnet_group_name" {
  description = "PostgreSQL DB subnet group name"
  value       = aws_db_subnet_group.postgresql_subnet_group.name
}

output "redis_subnet_group_name" {
  description = "Redis subnet group name"
  value       = aws_elasticache_subnet_group.redis_subnet_group.name
}

# Private Subnet Outputs
output "private_subnet_ids" {
  description = "Private subnet IDs for databases"
  value       = aws_subnet.private_subnets[*].id
}

output "private_subnet_cidrs" {
  description = "Private subnet CIDR blocks"
  value       = aws_subnet.private_subnets[*].cidr_block
}

# KMS Key Outputs
output "database_encryption_key_id" {
  description = "KMS key ID for database encryption"
  value       = aws_kms_key.database_encryption.key_id
}

output "database_encryption_key_arn" {
  description = "KMS key ARN for database encryption"
  value       = aws_kms_key.database_encryption.arn
}

# Monitoring Outputs
output "database_alerts_topic_arn" {
  description = "SNS topic ARN for database alerts"
  value       = aws_sns_topic.database_alerts.arn
}

output "postgresql_cloudwatch_log_group" {
  description = "PostgreSQL CloudWatch log group name"
  value       = aws_cloudwatch_log_group.postgresql_logs.name
}

output "redis_cloudwatch_log_group" {
  description = "Redis CloudWatch log group name"
  value       = aws_cloudwatch_log_group.redis_logs.name
}

# Connection Information (for application configuration)
output "database_connection_info" {
  description = "Database connection information for applications"
  value = {
    postgresql = {
      primary_endpoint = aws_db_instance.postgresql_primary.endpoint
      replica_endpoint = aws_db_instance.postgresql_replica.endpoint
      port            = aws_db_instance.postgresql_primary.port
      database_name   = aws_db_instance.postgresql_primary.db_name
      username        = aws_db_instance.postgresql_primary.username
    }
    redis = {
      primary_endpoint = aws_elasticache_replication_group.redis_cluster.primary_endpoint_address
      reader_endpoint  = aws_elasticache_replication_group.redis_cluster.reader_endpoint_address
      port            = aws_elasticache_replication_group.redis_cluster.port
    }
  }
  sensitive = true
}