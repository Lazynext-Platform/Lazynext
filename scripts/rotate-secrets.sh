#!/usr/bin/env bash
# rotate-secrets.sh — Rotate database passwords and API keys in Azure Key Vault
# Usage:
#   ./scripts/rotate-secrets.sh --db          # Rotate DB password
#   ./scripts/rotate-secrets.sh --api-keys    # Rotate all API keys
#   ./scripts/rotate-secrets.sh --all         # Rotate everything
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────

ENVIRONMENT="${ENVIRONMENT:-production}"
KV_NAME="lazynext-kv-${ENVIRONMENT}"
DB_SERVER="${DB_SERVER:-lazynext-postgres-${ENVIRONMENT}}"
RG_NAME="lazynext-rg-${ENVIRONMENT}"

# ── Generate random passwords/keys ──────────────────────────────────────────

generate_password() {
  local length="${1:-32}"
  openssl rand -base64 "$length" | tr -d '\n/+=' | cut -c1-"$length"
}

generate_api_key() {
  local prefix="${1:-sk}"
  echo "${prefix}_$(openssl rand -hex 24)"
}

# ── Rotate Database Password ────────────────────────────────────────────────

rotate_db_password() {
  local new_password
  new_password=$(generate_password 32)

  echo "🔐 Rotating database password for server: $DB_SERVER"

  # Update Azure PostgreSQL admin password
  az postgres flexible-server update \
    --resource-group "$RG_NAME" \
    --name "$DB_SERVER" \
    --admin-password "$new_password"

  # Update the connection string in Key Vault
  local fqdn
  fqdn=$(az postgres flexible-server show \
    --resource-group "$RG_NAME" \
    --name "$DB_SERVER" \
    --query "fullyQualifiedDomainName" -o tsv)

  local connection_string="postgresql://lazynext_app:${new_password}@${fqdn}:5432/lazynext?sslmode=require"

  az keyvault secret set \
    --vault-name "$KV_NAME" \
    --name "DATABASE--URL" \
    --value "$connection_string"

  echo "✅ Database password rotated. Secret updated: $KV_NAME/DATABASE--URL"
  echo "   Restart Container Apps to pick up the new password:"
  echo "   az containerapp revision restart --name lazynext-web-${ENVIRONMENT} --resource-group $RG_NAME"
}

# ── Rotate API Keys ─────────────────────────────────────────────────────────

rotate_api_key() {
  local key_name="$1"
  local prefix="$2"
  local new_value
  new_value=$(generate_api_key "$prefix")

  echo "🔑 Rotating: $key_name"

  az keyvault secret set \
    --vault-name "$KV_NAME" \
    --name "$key_name" \
    --value "$new_value"

  echo "   Updated: $KV_NAME/$key_name"
}

rotate_all_api_keys() {
  echo "🔑 Rotating all API keys..."
  rotate_api_key "openai--api--key" "sk"
  rotate_api_key "anthropic--api--key" "sk-ant"
  rotate_api_key "gemini--api--key" "AIza"
  rotate_api_key "replicate--api--token" "r8"
  rotate_api_key "elevenlabs--api--key" "el"
  rotate_api_key "stripe--secret--key" "sk_test"
  rotate_api_key "stripe--webhook--secret" "whsec"
  rotate_api_key "resend--api--key" "re"
  echo "✅ All API keys rotated."
}

# ── Main ────────────────────────────────────────────────────────────────────

case "${1:-}" in
  --db)
    rotate_db_password
    ;;
  --api-keys)
    rotate_all_api_keys
    ;;
  --all)
    rotate_db_password
    echo ""
    rotate_all_api_keys
    ;;
  *)
    echo "Usage: $0 --db | --api-keys | --all"
    exit 1
    ;;
esac
