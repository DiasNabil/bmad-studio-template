# Security Groups for Database Access
# BMAD Studio Template - Database Security Configuration

# PostgreSQL Security Group
resource "aws_security_group" "postgresql_sg" {
  name_prefix = "bmad-studio-postgresql-"
  description = "Security group for PostgreSQL database"
  vpc_id      = aws_vpc.bmad_studio_vpc.id

  # PostgreSQL port access from application servers
  ingress {
    description     = "PostgreSQL access from application servers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.bmad_app_sg.id]
  }

  # PostgreSQL port access from bastion host (for maintenance)
  ingress {
    description     = "PostgreSQL access from bastion host"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion_sg.id]
  }

  # PostgreSQL replication port
  ingress {
    description = "PostgreSQL replication"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    self        = true
  }

  # Outbound rules
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "BMAD Studio PostgreSQL Security Group"
    Environment = var.environment
    Service     = "postgresql"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Redis Security Group
resource "aws_security_group" "redis_sg" {
  name_prefix = "bmad-studio-redis-"
  description = "Security group for Redis cluster"
  vpc_id      = aws_vpc.bmad_studio_vpc.id

  # Redis port access from application servers
  ingress {
    description     = "Redis access from application servers"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.bmad_app_sg.id]
  }

  # Redis TLS port access from application servers
  ingress {
    description     = "Redis TLS access from application servers"
    from_port       = 6380
    to_port         = 6380
    protocol        = "tcp"
    security_groups = [aws_security_group.bmad_app_sg.id]
  }

  # Redis cluster bus port for inter-node communication
  ingress {
    description = "Redis cluster bus"
    from_port   = 16379
    to_port     = 16379
    protocol    = "tcp"
    self        = true
  }

  # Redis Sentinel port
  ingress {
    description     = "Redis Sentinel access"
    from_port       = 26379
    to_port         = 26379
    protocol        = "tcp"
    security_groups = [aws_security_group.bmad_app_sg.id]
  }

  # Redis access from bastion host (for maintenance)
  ingress {
    description     = "Redis access from bastion host"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion_sg.id]
  }

  # Outbound rules
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "BMAD Studio Redis Security Group"
    Environment = var.environment
    Service     = "redis"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Bastion Host Security Group
resource "aws_security_group" "bastion_sg" {
  name_prefix = "bmad-studio-bastion-"
  description = "Security group for bastion host"
  vpc_id      = aws_vpc.bmad_studio_vpc.id

  # SSH access from specific IP ranges (adjust as needed)
  ingress {
    description = "SSH access from office network"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  # Outbound rules
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "BMAD Studio Bastion Security Group"
    Environment = var.environment
    Service     = "bastion"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Monitoring Security Group
resource "aws_security_group" "monitoring_sg" {
  name_prefix = "bmad-studio-monitoring-"
  description = "Security group for monitoring services"
  vpc_id      = aws_vpc.bmad_studio_vpc.id

  # Prometheus metrics scraping from databases
  ingress {
    description     = "Prometheus PostgreSQL exporter"
    from_port       = 9187
    to_port         = 9187
    protocol        = "tcp"
    security_groups = [aws_security_group.bmad_app_sg.id]
  }

  ingress {
    description     = "Prometheus Redis exporter"
    from_port       = 9121
    to_port         = 9121
    protocol        = "tcp"
    security_groups = [aws_security_group.bmad_app_sg.id]
  }

  # Grafana dashboard access
  ingress {
    description = "Grafana dashboard access"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = var.allowed_cidr_blocks
  }

  # Outbound rules
  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "BMAD Studio Monitoring Security Group"
    Environment = var.environment
    Service     = "monitoring"
  }

  lifecycle {
    create_before_destroy = true
  }
}