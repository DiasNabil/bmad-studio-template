#!/bin/bash

# Vault Initialization and Configuration Script

set -e

# Initialize Vault if not already initialized
if [ ! -f "/vault/init.done" ]; then
    # Initialize Vault and capture unseal keys and root token
    vault operator init -key-shares=5 -key-threshold=3 > /vault/init-secrets.txt

    # Extract and store unseal keys and root token securely
    grep "Unseal Key" /vault/init-secrets.txt | cut -d: -f2 | tr -d ' ' > /vault/unseal-keys.txt
    grep "Root Token" /vault/init-secrets.txt | cut -d: -f2 | tr -d ' ' > /vault/root-token.txt

    # Unseal Vault
    for key in $(head -n 3 /vault/unseal-keys.txt); do
        vault operator unseal "$key"
    done

    # Login with root token
    vault login $(cat /vault/root-token.txt)

    # Enable secret engines
    vault secrets enable -path=secret kv-v2
    vault secrets enable -path=bmad-studio-secrets kv-v2

    # Configure Kubernetes authentication
    vault auth enable kubernetes

    # Create a policy for BMAD Studio
    vault policy write bmad-studio-policy - <<EOF
path "secret/data/bmad-studio/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "bmad-studio-secrets/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
EOF

    # Mark initialization complete
    touch /vault/init.done
fi

# Periodic secret rotation
vault write sys/config/auto-auth \
    method=kubernetes \
    mount_point=auth/kubernetes \
    max_lease_ttl=720h \
    default_lease_ttl=240h

echo "Vault initialization and configuration complete."