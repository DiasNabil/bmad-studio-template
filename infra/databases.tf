# Database Infrastructure for BMAD Studio Template
# PostgreSQL and Redis managed services with high availability

# PostgreSQL RDS Subnet Group
resource "aws_db_subnet_group" "postgresql_subnet_group" {
  name       = "bmad-studio-postgresql-subnet-group"
  subnet_ids = aws_subnet.private_subnets[*].id

  tags = {
    Name        = "BMAD Studio PostgreSQL Subnet Group"
    Environment = var.environment
  }
}

# PostgreSQL RDS Instance - Primary
resource "aws_db_instance" "postgresql_primary" {
  identifier = "bmad-studio-postgresql-primary"
  
  # Engine configuration
  engine               = "postgres"
  engine_version       = "14.9"
  instance_class       = var.db_instance_class
  allocated_storage    = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.database_encryption.arn
  
  # Database configuration
  db_name  = var.database_name
  username = var.database_username
  password = var.database_password
  port     = 5432
  
  # Network & Security
  vpc_security_group_ids = [aws_security_group.postgresql_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.postgresql_subnet_group.name
  publicly_accessible    = false
  
  # Backup configuration
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  auto_minor_version_upgrade = true
  
  # Performance Insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id = aws_kms_key.database_encryption.arn
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring_role.arn
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  
  # High Availability
  multi_az = true
  
  # Parameter group
  parameter_group_name = aws_db_parameter_group.postgresql_params.name
  
  # Deletion protection
  deletion_protection = true
  skip_final_snapshot = false
  final_snapshot_identifier = "bmad-studio-postgresql-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"
  
  tags = {
    Name        = "BMAD Studio PostgreSQL Primary"
    Environment = var.environment
    Backup     = "required"
  }
}

# PostgreSQL Read Replica
resource "aws_db_instance" "postgresql_replica" {
  identifier = "bmad-studio-postgresql-replica"
  
  # Replica configuration
  replicate_source_db = aws_db_instance.postgresql_primary.id
  instance_class      = var.db_replica_instance_class
  
  # Network & Security
  vpc_security_group_ids = [aws_security_group.postgresql_sg.id]
  publicly_accessible    = false
  
  # Performance Insights
  performance_insights_enabled = true
  performance_insights_retention_period = 7
  
  # Monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring_role.arn
  
  tags = {
    Name        = "BMAD Studio PostgreSQL Read Replica"
    Environment = var.environment
    Type        = "read-replica"
  }
}

# PostgreSQL Parameter Group
resource "aws_db_parameter_group" "postgresql_params" {
  family = "postgres14"
  name   = "bmad-studio-postgresql-params"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "max_connections"
    value = "200"
  }

  tags = {
    Name        = "BMAD Studio PostgreSQL Parameters"
    Environment = var.environment
  }
}

# ElastiCache Subnet Group
resource "aws_elasticache_subnet_group" "redis_subnet_group" {
  name       = "bmad-studio-redis-subnet-group"
  subnet_ids = aws_subnet.private_subnets[*].id

  tags = {
    Name        = "BMAD Studio Redis Subnet Group"
    Environment = var.environment
  }
}

# ElastiCache Redis Parameter Group
resource "aws_elasticache_parameter_group" "redis_params" {
  family = "redis7.x"
  name   = "bmad-studio-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  tags = {
    Name        = "BMAD Studio Redis Parameters"
    Environment = var.environment
  }
}

# ElastiCache Redis Replication Group
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id         = "bmad-studio-redis"
  description                  = "BMAD Studio Redis Cluster"
  
  # Engine configuration
  engine               = "redis"
  engine_version       = "7.0"
  node_type           = var.redis_node_type
  port                = 6379
  
  # Cluster configuration
  num_cache_clusters = var.redis_num_cache_nodes
  parameter_group_name = aws_elasticache_parameter_group.redis_params.name
  
  # Network & Security
  subnet_group_name    = aws_elasticache_subnet_group.redis_subnet_group.name
  security_group_ids   = [aws_security_group.redis_sg.id]
  
  # Encryption
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                = aws_kms_key.database_encryption.arn
  auth_token                = var.redis_auth_token
  
  # Backup
  snapshot_retention_limit = 7
  snapshot_window         = "05:00-09:00"
  maintenance_window      = "sun:09:00-sun:10:00"
  
  # Automatic failover
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  # Notifications
  notification_topic_arn = aws_sns_topic.database_alerts.arn
  
  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_logs.name
    destination_type = "cloudwatch-logs"
    log_format      = "text"
    log_type        = "slow-log"
  }
  
  tags = {
    Name        = "BMAD Studio Redis Cluster"
    Environment = var.environment
  }
}

# Private subnets for databases
resource "aws_subnet" "private_subnets" {
  count             = 2
  vpc_id            = aws_vpc.bmad_studio_vpc.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = "${var.region}${count.index == 0 ? "a" : "b"}"
  
  tags = {
    Name = "bmad-studio-private-subnet-${count.index + 1}"
    Type = "private"
    Environment = var.environment
  }
}

# Route table for private subnets
resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.bmad_studio_vpc.id
  
  tags = {
    Name = "bmad-studio-private-rt"
    Environment = var.environment
  }
}

# Route table associations for private subnets
resource "aws_route_table_association" "private_rta" {
  count          = length(aws_subnet.private_subnets)
  subnet_id      = aws_subnet.private_subnets[count.index].id
  route_table_id = aws_route_table.private_rt.id
}

# KMS Key for database encryption
resource "aws_kms_key" "database_encryption" {
  description             = "KMS key for BMAD Studio database encryption"
  deletion_window_in_days = 7
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "BMAD Studio Database Encryption"
    Environment = var.environment
  }
}

resource "aws_kms_alias" "database_encryption_alias" {
  name          = "alias/bmad-studio-database-encryption"
  target_key_id = aws_kms_key.database_encryption.key_id
}

# IAM Role for RDS Enhanced Monitoring
resource "aws_iam_role" "rds_monitoring_role" {
  name = "bmad-studio-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "BMAD Studio RDS Monitoring Role"
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "rds_monitoring_policy" {
  role       = aws_iam_role.rds_monitoring_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# SNS Topic for database alerts
resource "aws_sns_topic" "database_alerts" {
  name = "bmad-studio-database-alerts"
  
  tags = {
    Name        = "BMAD Studio Database Alerts"
    Environment = var.environment
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "postgresql_logs" {
  name              = "/aws/rds/instance/bmad-studio-postgresql/postgresql"
  retention_in_days = 30
  
  tags = {
    Name        = "BMAD Studio PostgreSQL Logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "redis_logs" {
  name              = "/aws/elasticache/bmad-studio-redis"
  retention_in_days = 30
  
  tags = {
    Name        = "BMAD Studio Redis Logs"
    Environment = var.environment
  }
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}