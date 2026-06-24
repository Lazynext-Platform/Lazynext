#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────
# Lazynext — GCP Secret Manager Bootstrap
# ───────────────────────────────────────────────────────────────────
# Creates all required secrets in GCP Secret Manager for the
# External Secrets Operator to sync into Kubernetes.
#
# Prerequisites:
#   1. gcloud CLI installed and authenticated
#   2. gcloud config set project vertexaiopencode
#
# Usage:
#   chmod +x scripts/setup-gcp-secrets.sh
#   ./scripts/setup-gcp-secrets.sh
#
# To populate a specific secret:
#   ./scripts/setup-gcp-secrets.sh --secret DATABASE_URL --value "postgresql://..."
# ───────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-vertexaiopencode}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
REGION="${GCP_REGION:-us-central1}"
DRY_RUN="${DRY_RUN:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

# ── Parse args ────────────────────────────────────────────────────
SINGLE_SECRET=""
SINGLE_VALUE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --secret) SINGLE_SECRET="$2"; shift 2 ;;
    --value)  SINGLE_VALUE="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) err "Unknown flag: $1"; exit 1 ;;
  esac
done

# ── Create or update a single secret ──────────────────────────────
create_secret() {
  local secret_id="$1"
  local value="${2:-}"
  local full_id="${secret_id}-${ENVIRONMENT}"

  # If value not provided, prompt
  if [[ -z "$value" ]]; then
    read -rsp "Enter value for ${full_id} (input hidden): " value
    echo
  fi

  if [[ -z "$value" ]]; then
    warn "Skipping ${full_id} — no value provided"
    return
  fi

  # Check if secret exists
  if gcloud secrets describe "${full_id}" --project="${PROJECT_ID}" &>/dev/null; then
    if [[ "$DRY_RUN" == "true" ]]; then
      log "[DRY-RUN] Would add new version to existing secret: ${full_id}"
    else
      echo -n "${value}" | gcloud secrets versions add "${full_id}" --data-file=-
      log "Added new version to existing secret: ${full_id}"
    fi
  else
    if [[ "$DRY_RUN" == "true" ]]; then
      log "[DRY-RUN] Would create secret: ${full_id}"
    else
      echo -n "${value}" | gcloud secrets create "${full_id}" \
        --replication-policy="automatic" \
        --project="${PROJECT_ID}" \
        --labels="environment=${ENVIRONMENT},managed-by=terraform" \
        --data-file=-
      log "Created secret: ${full_id}"
    fi
  fi
}

# ── Main ──────────────────────────────────────────────────────────
echo "=============================================="
echo " Lazynext — GCP Secret Manager Bootstrap"
echo " Project: ${PROJECT_ID}"
echo " Environment: ${ENVIRONMENT}"
echo " Dry Run: ${DRY_RUN}"
echo "=============================================="
echo

# If single secret mode
if [[ -n "$SINGLE_SECRET" ]]; then
  create_secret "$SINGLE_SECRET" "$SINGLE_VALUE"
  exit 0
fi

# ── All required secrets ──────────────────────────────────────────
# These match the ExternalSecret definition in k8s/base/security-policies.yaml

echo "Setting up all Lazynext secrets for environment: ${ENVIRONMENT}"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read -r

# Database
create_secret "DATABASE_URL" \
  "postgresql://lazynext_app:CHANGE_ME@lazynext-postgres-${ENVIRONMENT}:5432/lazynext?sslmode=require"

# Auth
create_secret "BETTER_AUTH_SECRET" \
  "$(openssl rand -base64 48 | tr -d '\n')"

# AI Providers
create_secret "OPENAI_API_KEY" ""
create_secret "ANTHROPIC_API_KEY" ""
create_secret "GEMINI_API_KEY" ""

# ML/Media APIs
create_secret "REPLICATE_API_TOKEN" ""
create_secret "ELEVENLABS_API_KEY" ""

# Payments
create_secret "STRIPE_SECRET_KEY" ""
create_secret "STRIPE_WEBHOOK_SECRET" ""

# Email
create_secret "RESEND_API_KEY" ""

# Redis/Rate Limiting
create_secret "UPSTASH_REDIS_REST_TOKEN" \
  "$(openssl rand -base64 32 | tr -d '\n')"

# CMS
create_secret "MARBLE_WORKSPACE_KEY" ""
create_secret "FREESOUND_CLIENT_ID" ""
create_secret "FREESOUND_API_KEY" ""

# Analytics
create_secret "POSTHOG_KEY" ""

echo
echo "=============================================="
log "Secret setup complete for environment: ${ENVIRONMENT}"
log "Verify with: gcloud secrets list --project=${PROJECT_ID}"
echo "=============================================="
