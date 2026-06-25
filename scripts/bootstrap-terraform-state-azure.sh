#!/usr/bin/env bash
# bootstrap-terraform-state-azure.sh — One-time setup for Azure Terraform remote state
# Creates the Resource Group, Storage Account, and Blob Container for Terraform state.
#
# Prerequisites:
#   1. Azure CLI installed and authenticated (az login)
#   2. An active Azure subscription
#
# Usage:
#   ./scripts/bootstrap-terraform-state-azure.sh
set -euo pipefail

AZURE_LOCATION="${AZURE_LOCATION:-eastus}"
RG_NAME="lazynext-terraform-rg"
STORAGE_ACCOUNT_NAME="lazynexttfstate"
CONTAINER_NAME="tfstate"

echo "============================================"
echo " Lazynext Azure Terraform State Bootstrap"
echo "============================================"
echo ""
echo "  Location:      $AZURE_LOCATION"
echo "  Resource Group: $RG_NAME"
echo "  Storage Acct:  $STORAGE_ACCOUNT_NAME"
echo "  Container:     $CONTAINER_NAME"
echo ""

# ── Create Resource Group ──────────────────────────────────────────────────

echo "📦 Creating resource group: $RG_NAME"
az group create \
  --name "$RG_NAME" \
  --location "$AZURE_LOCATION" \
  --tags Project=lazynext Purpose=terraform-state

# ── Create Storage Account ─────────────────────────────────────────────────

echo "📦 Creating storage account: $STORAGE_ACCOUNT_NAME"
az storage account create \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$RG_NAME" \
  --location "$AZURE_LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false

# ── Create Blob Container ──────────────────────────────────────────────────

echo "📦 Creating blob container: $CONTAINER_NAME"
az storage container create \
  --name "$CONTAINER_NAME" \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --auth-mode login

echo ""
echo "============================================"
echo " ✅ Bootstrap complete!"
echo "============================================"
echo ""
echo "   Resource Group:  $RG_NAME"
echo "   Storage Account: $STORAGE_ACCOUNT_NAME"
echo "   Container:       $CONTAINER_NAME"
echo ""
echo "You can now run:"
echo "   cd terraform/azure"
echo "   terraform init"
echo ""
