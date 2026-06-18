#!/usr/bin/env bash
# rotate-secrets.sh — Rotate database passwords and API keys
# Usage:
#   ./scripts/rotate-secrets.sh --db          # Rotate DB password
#   ./scripts/rotate-secrets.sh --api-keys    # Rotate all API keys
#   ./scripts/rotate-secrets.sh --all         # Rotate everything
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────

PROJECT_ID="${PROJECT_ID:-vertexaiopencode}"
ENVIRONMENT="${ENVIRONMENT:-production}"
DB_INSTANCE="${DB_INSTANCE:-lazynext-db-$ENVIRONMENT}"
SECRET_PREFIX="lazynext"

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
  echo "🔐 Rotating database password for $DB_INSTANCE..."

  local new_password
  new_password=$(generate_password 32)

  # Update Cloud SQL user password
  echo "   Updating Cloud SQL user..."
  gcloud sql users set-password lazynext_app \
    --instance="$DB_INSTANCE" \
    --password="$new_password" \
    --project="$PROJECT_ID"

  # Update Secret Manager
  echo "   Updating Secret Manager..."
  printf "%s" "$new_password" | gcloud secrets versions add DATABASE_URL \
    --data-file=- \
    --project="$PROJECT_ID"

  # Update Kubernetes secret
  echo "   Updating Kubernetes secret..."
  kubectl create secret generic lazynext-secrets \
    --namespace=lazynext \
    --from-literal=POSTGRES_PASSWORD="$new_password" \
    --dry-run=client -o yaml | kubectl apply -f -

  # Restart deployments to pick up new secrets
  echo "   Restarting deployments..."
  kubectl rollout restart deployment/lazynext-web -n lazynext
  kubectl rollout restart deployment/lazynext-sync -n lazynext

  echo "✅ Database password rotated. Restart complete."
}

# ── Rotate API Keys ─────────────────────────────────────────────────────────

rotate_api_keys() {
  echo "🔑 Rotating API keys..."

  local secrets=(
    "BETTER_AUTH_SECRET"
  )

  for secret_name in "${secrets[@]}"; do
    local new_value
    new_value=$(generate_password 64)

    echo "   Rotating: $secret_name"

    printf "%s" "$new_value" | gcloud secrets versions add "$secret_name" \
      --data-file=- \
      --project="$PROJECT_ID" 2>/dev/null || echo "   ⚠️  Secret $secret_name not in GCP Secret Manager"

    # Update K8s
    # Patch only this key, preserving all other secrets
    kubectl create secret generic lazynext-secrets \
      --namespace=lazynext \
      --from-literal="$secret_name=$new_value" \
      --dry-run=client -o yaml | kubectl apply -f -
  done

  echo "✅ API keys rotated."
}

# ── Main ────────────────────────────────────────────────────────────────────

case "${1:-}" in
  --db)
    rotate_db_password
    ;;
  --api-keys)
    rotate_api_keys
    ;;
  --all)
    rotate_db_password
    rotate_api_keys
    echo ""
    echo "✅ All secrets rotated."
    echo "⚠️  Remember to update any external integrations:"
    echo "   - Stripe webhook secrets"
    echo "   - Resend API keys"
    echo "   - CI/CD environment variables"
    ;;
  --help|-h)
    echo "Usage: $0 [--db | --api-keys | --all]"
    echo ""
    echo "  --db        Rotate database password + restart deployments"
    echo "  --api-keys  Rotate Better Auth secret + other generated secrets"
    echo "  --all       Rotate everything"
    exit 0
    ;;
  *)
    echo "Unknown flag: ${1:-}"
    echo "Usage: $0 [--db | --api-keys | --all]"
    exit 1
    ;;
esac
