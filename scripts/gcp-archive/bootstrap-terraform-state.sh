#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────
# Lazynext — Terraform State Bootstrap
# ───────────────────────────────────────────────────────────────────
# Creates the GCS backend bucket and enables required GCP APIs.
# Must be run ONCE before the first `terraform init`.
#
# Usage:
#   chmod +x scripts/bootstrap-terraform-state.sh
#   ./scripts/bootstrap-terraform-state.sh
# ───────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-vertexaiopencode}"
BUCKET_NAME="${TERRAFORM_STATE_BUCKET:-${PROJECT_ID}-terraform-state}"
REGION="${GCP_REGION:-us-central1}"
DRY_RUN="${DRY_RUN:-false}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --project) PROJECT_ID="$2"; shift 2 ;;
    --bucket)  BUCKET_NAME="$2"; shift 2 ;;
    *) err "Unknown flag: $1" ;;
  esac
done

echo "=============================================="
echo " Lazynext — Terraform State Bootstrap"
echo " Project: ${PROJECT_ID}"
echo " Bucket:  ${BUCKET_NAME}"
echo " Region:  ${REGION}"
echo " Dry Run: ${DRY_RUN}"
echo "=============================================="
echo

# ── Step 1: Enable required GCP APIs ──────────────────────────────
REQUIRED_APIS=(
  "compute.googleapis.com"
  "container.googleapis.com"
  "cloudresourcemanager.googleapis.com"
  "sqladmin.googleapis.com"
  "run.googleapis.com"
  "secretmanager.googleapis.com"
  "storage-component.googleapis.com"
  "vpcaccess.googleapis.com"
  "iamcredentials.googleapis.com"
  "cloudbuild.googleapis.com"
  "artifactregistry.googleapis.com"
)

echo "Step 1/4: Enabling required GCP APIs..."
for api in "${REQUIRED_APIS[@]}"; do
  if [[ "$DRY_RUN" == "true" ]]; then
    log "[DRY-RUN] Would enable: ${api}"
  else
    gcloud services enable "${api}" --project="${PROJECT_ID}" 2>/dev/null && \
      log "Enabled: ${api}" || \
      warn "Already enabled or failed: ${api}"
  fi
done
echo

# ── Step 2: Create the Terraform state bucket ─────────────────────
echo "Step 2/4: Creating Terraform state bucket..."
BUCKET_EXISTS=$(gcloud storage ls "gs://${BUCKET_NAME}" --project="${PROJECT_ID}" 2>/dev/null || true)

if [[ -n "$BUCKET_EXISTS" ]]; then
  log "Bucket already exists: gs://${BUCKET_NAME}"
else
  if [[ "$DRY_RUN" == "true" ]]; then
    log "[DRY-RUN] Would create: gs://${BUCKET_NAME} in ${REGION}"
  else
    gcloud storage buckets create "gs://${BUCKET_NAME}" \
      --project="${PROJECT_ID}" \
      --location="${REGION}" \
      --uniform-bucket-level-access \
      --public-access-prevention=enforced
    log "Created bucket: gs://${BUCKET_NAME}"
  fi
fi
echo

# ── Step 3: Enable versioning on the bucket ───────────────────────
echo "Step 3/4: Enabling object versioning..."
if [[ "$DRY_RUN" == "true" ]]; then
  log "[DRY-RUN] Would enable versioning on gs://${BUCKET_NAME}"
else
  gcloud storage buckets update "gs://${BUCKET_NAME}" --versioning
  log "Versioning enabled on gs://${BUCKET_NAME}"
fi
echo

# ── Step 4: Set lifecycle policy ──────────────────────────────────
echo "Step 4/4: Setting lifecycle policy..."
LIFECYCLE_FILE=$(mktemp)
cat > "${LIFECYCLE_FILE}" << 'LCEOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 90,
          "numNewerVersions": 10,
          "isLive": false
        }
      },
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 365,
          "isLive": true,
          "matchesPrefix": ["terraform/state/"]
        }
      }
    ]
  }
}
LCEOF

if [[ "$DRY_RUN" == "true" ]]; then
  log "[DRY-RUN] Would set lifecycle policy on gs://${BUCKET_NAME}"
else
  gcloud storage buckets update "gs://${BUCKET_NAME}" \
    --lifecycle-file="${LIFECYCLE_FILE}"
  rm -f "${LIFECYCLE_FILE}"
  log "Lifecycle policy set: non-current versions deleted after 90 days, old state files after 365 days"
fi
echo

echo "=============================================="
log "Terraform state bootstrap complete!"
echo
echo "Now run:"
echo "  cd terraform/gcp"
echo "  terraform init"
echo "  terraform plan"
echo "  terraform apply"
echo "=============================================="
