#!/usr/bin/env bash
# finish-provision.sh — Complete the Azure provisioning + GitHub secrets
# Run this with: bash scripts/finish-provision.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TF_DIR="$SCRIPT_DIR/../terraform/azure"

echo "========================================="
echo " Step 1: Fix storage account key access"
echo "========================================="
az storage account update \
  --name lazynextmediadevlmblwn \
  --resource-group lazynext-rg-dev \
  --enable-shared-key true
echo "Done."

echo ""
echo "========================================="
echo " Step 2: Apply Terraform (provision ~32 remaining resources)"
echo "========================================="
terraform -chdir=$TF_DIR apply -auto-approve
echo "Done."

echo ""
echo "========================================="
echo " Step 3: Outputs"
echo "========================================="
terraform -chdir=$TF_DIR output

echo ""
echo "========================================="
echo " Step 4: Set AZURE_CLIENT_ID GitHub secret"
echo "========================================="
CLIENT_ID=$(terraform -chdir=$TF_DIR output -raw github_actions_identity_client_id)
if [ -n "$CLIENT_ID" ]; then
  echo "$CLIENT_ID" | gh secret set AZURE_CLIENT_ID -R Lazynext-Platform/Lazynext
  echo "AZURE_CLIENT_ID set successfully: $CLIENT_ID"
else
  echo "ERROR: Could not get client ID. Check terraform state."
  exit 1
fi

echo ""
echo "========================================="
echo " Step 5: Verify all outputs"
echo "========================================="
echo "ACR Login Server: $(terraform -chdir=$TF_DIR output -raw acr_login_server)"
echo "PostgreSQL FQDN:  $(terraform -chdir=$TF_DIR output -raw postgres_fqdn)"
echo "Key Vault Name:   $(terraform -chdir=$TF_DIR output -raw key_vault_name)"
echo "Media Bucket:     media @ $(terraform -chdir=$TF_DIR output -raw storage_account_name)"

echo ""
echo "========================================="
echo " ✅ ALL DONE! Azure infrastructure is live."
echo "========================================="
echo ""
echo "Push to main to trigger CI/CD deploy: git push origin main"
