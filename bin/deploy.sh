#!/bin/bash

# BMAD Studio Deployment Script
# Comprehensive deployment with Vault, Kubernetes, and CI/CD integration

set -e

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Deployment Configuration
CLUSTER_NAME="bmad-studio-cluster"
NAMESPACE="bmad-studio"
VAULT_NAMESPACE="vault-system"

# Logging function
log() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

# Error handling function
error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check kubectl connection
    kubectl cluster-info || error "Kubernetes cluster is not accessible"
    
    # Check Vault status
    vault status > /dev/null 2>&1 || error "Vault is not initialized or accessible"
    
    # Verify required tools
    for tool in kubectl vault terraform docker; do
        command -v $tool >/dev/null 2>&1 || error "$tool is not installed"
    done
}

# Initialize Vault
initialize_vault() {
    log "Initializing Vault..."
    
    # Create Vault namespace
    kubectl create namespace $VAULT_NAMESPACE || true
    
    # Deploy Vault configuration
    kubectl apply -f configs/security/vault-config.hcl -n $VAULT_NAMESPACE
    
    # Run Vault initialization script
    bash configs/security/vault-init.sh
}

# Deploy Kubernetes Infrastructure
deploy_kubernetes_infrastructure() {
    log "Deploying Kubernetes Infrastructure..."
    
    # Initialize Terraform
    cd infra/kubernetes
    terraform init
    terraform validate
    
    # Plan and apply Terraform configuration
    terraform plan -out=tfplan
    terraform apply tfplan
    
    cd ../..
}

# Configure Secrets Management
configure_secrets() {
    log "Configuring Secrets Management..."
    
    # Enable Vault KV secrets engine
    vault secrets enable -path=bmad-studio kv-v2
    
    # Store initial secrets (replace with your actual secret management)
    vault kv put bmad-studio/production \
        database_url="placeholder_db_url" \
        api_key="placeholder_api_key" \
        stripe_secret="placeholder_stripe_secret"
}

# Deploy Application
deploy_application() {
    log "Deploying BMAD Studio Application..."
    
    # Create application namespace
    kubectl create namespace $NAMESPACE || true
    
    # Apply Kubernetes manifests
    kubectl apply -f infra/kubernetes/manifests/ -n $NAMESPACE
}

# Post-deployment Validation
validate_deployment() {
    log "Validating Deployment..."
    
    # Check Vault pods
    kubectl get pods -n $VAULT_NAMESPACE
    
    # Check application pods
    kubectl get pods -n $NAMESPACE
    
    # Run basic health checks
    kubectl rollout status deployment/bmad-studio -n $NAMESPACE
}

# Main Deployment Workflow
main() {
    log "${YELLOW}Starting BMAD Studio Deployment${NC}"
    
    pre_deployment_checks
    initialize_vault
    deploy_kubernetes_infrastructure
    configure_secrets
    deploy_application
    validate_deployment
    
    log "${GREEN}Deployment Completed Successfully!${NC}"
}

# Execute main deployment function
main

# Optional: Trigger post-deployment monitoring setup
# bash bin/monitoring-setup.sh
