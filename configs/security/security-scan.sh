#!/bin/bash

# BMAD Studio Security and Compliance Automation Script

set -e
set -o pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Security Scan Configuration
SCAN_RESULTS_DIR="$(dirname "$0")/../../security-reports"
mkdir -p "$SCAN_RESULTS_DIR"

# Dependency Security Scan
scan_dependencies() {
    log_info "Running dependency vulnerability scan..."
    
    # NPM audit with custom severity threshold
    npm audit --audit-level=high > "$SCAN_RESULTS_DIR/dependency-vulnerabilities.txt" || {
        log_warning "Dependency vulnerabilities detected!"
        cat "$SCAN_RESULTS_DIR/dependency-vulnerabilities.txt"
    }

    # Snyk security scan
    if command -v snyk &> /dev/null; then
        snyk test --severity-threshold=high > "$SCAN_RESULTS_DIR/snyk-vulnerabilities.txt" || {
            log_warning "Security vulnerabilities found by Snyk"
            cat "$SCAN_RESULTS_DIR/snyk-vulnerabilities.txt"
        }
    else
        log_warning "Snyk not installed. Skipping advanced dependency scanning."
    fi
}

# Static Application Security Testing (SAST)
sast_scan() {
    log_info "Performing Static Application Security Testing..."
    
    # SonarQube scan
    if command -v sonar-scanner &> /dev/null; then
        sonar-scanner \
            -Dsonar.projectKey=bmad-studio \
            -Dsonar.sources=. \
            -Dsonar.host.url=https://sonarcloud.io \
            > "$SCAN_RESULTS_DIR/sonarqube-report.txt" || {
            log_warning "SonarQube detected potential security issues"
        }
    else
        log_warning "SonarQube scanner not found. Skipping code quality scan."
    fi

    # Use NodeJSScan for JavaScript-specific security analysis
    if command -v nodejsscan &> /dev/null; then
        nodejsscan -d . -o "$SCAN_RESULTS_DIR/nodejsscan-report.json"
    fi
}

# Container Security Scan
container_security_scan() {
    log_info "Scanning container images for vulnerabilities..."
    
    # Docker image vulnerability scan
    if command -v docker &> /dev/null; then
        # Scan all project Docker images
        docker images --format "{{.Repository}}:{{.Tag}}" | while read -r image; do
            trivy image "$image" > "$SCAN_RESULTS_DIR/trivy-${image//\//-}.txt" || {
                log_warning "Vulnerabilities found in $image"
            }
        done
    else
        log_warning "Docker not installed. Skipping container security scan."
    fi
}

# Compliance Checks
compliance_checks() {
    log_info "Running compliance and best practices checks..."
    
    # Check for GDPR, CCPA compliance markers
    grep -r "TODO: Implement data protection" . > "$SCAN_RESULTS_DIR/compliance-todos.txt" || true
    
    # Check for hardcoded secrets
    if command -v detect-secrets &> /dev/null; then
        detect-secrets scan > "$SCAN_RESULTS_DIR/secret-scan-report.json"
    fi

    # Check SSL/TLS configuration
    if command -v testssl.sh &> /dev/null; then
        testssl.sh https://localhost:3000 > "$SCAN_RESULTS_DIR/ssl-tls-report.txt"
    fi
}

# Generate Comprehensive Security Report
generate_security_report() {
    log_info "Generating comprehensive security report..."
    
    # Combine all scan results
    {
        echo "=== BMAD Studio Security Report ==="
        echo "Date: $(date)"
        echo ""
        echo "--- Dependency Vulnerabilities ---"
        cat "$SCAN_RESULTS_DIR/dependency-vulnerabilities.txt" || echo "No dependency vulnerabilities."
        echo ""
        echo "--- Compliance TODOs ---"
        cat "$SCAN_RESULTS_DIR/compliance-todos.txt" || echo "No compliance items found."
    } > "$SCAN_RESULTS_DIR/comprehensive-security-report.txt"
}

# Main Execution
main() {
    log_info "Starting comprehensive security scan..."
    
    # Create security results directory
    mkdir -p "$SCAN_RESULTS_DIR"
    
    # Run security scans
    scan_dependencies
    sast_scan
    container_security_scan
    compliance_checks
    
    # Generate final report
    generate_security_report
    
    log_info "Security scan completed. Review reports in $SCAN_RESULTS_DIR"
}

# Execute main workflow
main

exit 0