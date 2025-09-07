# Variables for BMAD Studio Template Infrastructure
# Database and Redis Configuration Variables

# General Variables
variable "region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (development, staging, production)"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "bmad-studio"
}

# Network Variables
variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access bastion host and monitoring"
  type        = list(string)
  default     = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]
}

# PostgreSQL Variables
variable "database_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "bmad_studio_db"
}

variable "database_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "bmad_admin"
  sensitive   = true
}

variable "database_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class for PostgreSQL"
  type        = string
  default     = "db.t3.medium"
}

variable "db_replica_instance_class" {
  description = "RDS instance class for PostgreSQL read replica"
  type        = string
  default     = "db.t3.small"
}

variable "db_allocated_storage" {
  description = "Initial allocated storage for PostgreSQL (GB)"
  type        = number
  default     = 100
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for PostgreSQL (GB)"
  type        = number
  default     = 1000
}

# Redis Variables
variable "redis_node_type" {
  description = "ElastiCache node type for Redis"
  type        = string
  default     = "cache.t3.medium"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in Redis cluster"
  type        = number
  default     = 3
}

variable "redis_auth_token" {
  description = "Authentication token for Redis cluster"
  type        = string
  sensitive   = true
}

# Backup and Maintenance Variables
variable "backup_retention_period" {
  description = "Backup retention period in days"
  type        = number
  default     = 30
}

variable "backup_window" {
  description = "Preferred backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

# Monitoring Variables
variable "performance_insights_retention_period" {
  description = "Performance Insights retention period in days"
  type        = number
  default     = 7
}

variable "monitoring_interval" {
  description = "Enhanced monitoring interval in seconds"
  type        = number
  default     = 60
}

# Security Variables
variable "enable_deletion_protection" {
  description = "Enable deletion protection for databases"
  type        = bool
  default     = true
}

variable "enable_encryption" {
  description = "Enable encryption at rest for databases"
  type        = bool
  default     = true
}

variable "enable_transit_encryption" {
  description = "Enable encryption in transit"
  type        = bool
  default     = true
}

# Environment-specific overrides
variable "environment_configs" {
  description = "Environment-specific configuration overrides"
  type = map(object({
    db_instance_class               = string
    redis_node_type                = string
    backup_retention_period        = number
    performance_insights_enabled   = bool
    multi_az_enabled               = bool
    deletion_protection_enabled    = bool
  }))
  
  default = {
    development = {
      db_instance_class               = "db.t3.micro"
      redis_node_type                = "cache.t3.micro"
      backup_retention_period        = 7
      performance_insights_enabled   = false
      multi_az_enabled               = false
      deletion_protection_enabled    = false
    }
    staging = {
      db_instance_class               = "db.t3.small"
      redis_node_type                = "cache.t3.small"
      backup_retention_period        = 14
      performance_insights_enabled   = true
      multi_az_enabled               = true
      deletion_protection_enabled    = false
    }
    production = {
      db_instance_class               = "db.t3.medium"
      redis_node_type                = "cache.t3.medium"
      backup_retention_period        = 30
      performance_insights_enabled   = true
      multi_az_enabled               = true
      deletion_protection_enabled    = true
    }
  }
}

# Tags
variable "default_tags" {
  description = "Default tags to apply to all resources"
  type        = map(string)
  default = {
    Project     = "BMAD Studio"
    Owner       = "BMAD Studio DevOps Team"
    Terraform   = "true"
    ManagedBy   = "terraform"
  }
}