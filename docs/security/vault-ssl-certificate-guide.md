# Vault SSL Certificate Generation Guide

## Prerequisites
- OpenSSL
- A Certificate Authority (CA) or willingness to set up a private CA
- Basic understanding of SSL/TLS concepts

## Step 1: Create a Certificate Authority (CA)

### Generate CA Private Key
```bash
# Create CA private key
openssl genrsa -out /etc/vault/tls/ca.key 4096

# Create CA certificate
openssl req -x509 -new -nodes -key /etc/vault/tls/ca.key \
    -sha256 -days 1825 -out /etc/vault/tls/ca.crt \
    -subj "/C=FR/ST=IDF/L=Paris/O=YourOrg/CN=VaultCA"
```

## Step 2: Generate Vault Server Certificate

### Create Server Private Key
```bash
# Generate server private key
openssl genrsa -out /etc/vault/tls/vault.key 2048

# Create Certificate Signing Request (CSR)
openssl req -new -key /etc/vault/tls/vault.key \
    -out /etc/vault/tls/vault.csr \
    -subj "/C=FR/ST=IDF/L=Paris/O=YourOrg/CN=vault.example.com"
```

### Create Server Certificate Configuration
Create a file `vault-cert.ext` with Subject Alternative Names:
```
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = vault.example.com
DNS.2 = vault
IP.1 = 127.0.0.1
IP.2 = YOUR_SERVER_IP
```

### Sign the Certificate
```bash
openssl x509 -req -in /etc/vault/tls/vault.csr \
    -CA /etc/vault/tls/ca.crt \
    -CAkey /etc/vault/tls/ca.key \
    -CAcreateserial \
    -out /etc/vault/tls/vault.crt \
    -days 365 \
    -sha256 \
    -extfile vault-cert.ext
```

## Step 3: Secure Certificate Files
```bash
# Set restrictive permissions
chmod 0600 /etc/vault/tls/vault.key
chmod 0644 /etc/vault/tls/vault.crt
chmod 0644 /etc/vault/tls/ca.crt
```

## Step 4: Certificate Renewal
- Set up a cron job or systemd timer to renew certificates before expiration
- Recommended renewal window: 30 days before expiration

## Security Best Practices
1. Store CA key securely offline
2. Use strong, unique passwords for keys
3. Rotate certificates annually
4. Monitor certificate expiration

## Troubleshooting
- Verify certificate: 
  ```bash
  openssl verify -CAfile /etc/vault/tls/ca.crt /etc/vault/tls/vault.crt
  ```

## Notes
- Replace placeholders (YOUR_SERVER_IP, vault.example.com) with your actual details
- Adjust certificate validity periods as per your security policy