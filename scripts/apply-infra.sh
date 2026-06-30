#!/usr/bin/env bash
# Apply Azure infrastructure — idempotent Terraform apply with validation.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

ENV="${LAZYNEXT_ENV:-production}"
TF_DIR="$SCRIPT_DIR/../infra/terraform"

if [[ ! -d "$TF_DIR" ]]; then
  echo "Terraform directory not found: $TF_DIR"
  exit 1
fi

cd "$TF_DIR"

# Initialize if needed
if [[ ! -d ".terraform" ]]; then
  echo "Initializing Terraform..."
  terraform init -backend-config="key=azure/terraform.tfstate"
fi

echo "Planning Terraform apply for environment: $ENV"
terraform plan -var="environment=$ENV" -out=tfplan || {
  echo "Terraform plan failed"
  exit 1
}

echo "Applying infrastructure..."
terraform apply -auto-approve tfplan

echo ""
echo "=== Infrastructure Outputs ==="
terraform output -json 2>/dev/null || true

