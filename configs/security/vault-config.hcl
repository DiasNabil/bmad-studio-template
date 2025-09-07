ui = true

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 0
  tls_cert_file = "/etc/vault/tls/vault.crt"
  tls_key_file  = "/etc/vault/tls/vault.key"
  
  # Enhance TLS security
  tls_min_version = "tls12"
  tls_cipher_suites = [
    "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
    "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
  ]
}

storage "raft" {
  path = "/vault/data"
  node_id = "vault-node-1"
  retry_join {
    leader_api_addr = "https://vault-leader.example.com:8200"
    leader_ca_cert_file = "/etc/vault/tls/ca.crt"
  }
}

# High availability and performance configuration
cluster_addr = "https://vault:8201"
api_addr = "https://vault:8200"

# Lease and token configurations
max_lease_ttl = "24h"
default_lease_ttl = "8h"
token_ttl = "4h"
token_max_ttl = "24h"

# Enable key-value secrets engine with strict policies
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
  required_parameters = ["ttl"]
}

# Kubernetes authentication with enhanced security
auto_auth {
  method "kubernetes" {
    mount_path = "auth/kubernetes"
    config = {
      role = "bmad-studio-role"
      jwt_validation_pubkeys = ["/etc/vault/kubernetes/jwt-validation-key.pem"]
    }
  }

  sink "file" {
    config = {
      path = "/vault/secrets/token"
      mode = 0600  # Restrict file permissions
    }
  }
}

# Audit logging
audit "file" {
  path = "/var/log/vault/audit.log"
  format = "json"
}

# Enable automatic seal/unseal using Cloud KMS (example with AWS)
seal "awskms" {
  region     = "us-west-2"
  kms_key_id = "arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab"
}