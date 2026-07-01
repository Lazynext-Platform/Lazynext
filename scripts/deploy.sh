#!/bin/bash
# deploy.sh — Master deployment orchestrator for the Lazynext platform.
#
# Runs the full deployment pipeline: Terraform infra, WASM build, Fastlane mobile
# builds, desktop codesigning, and browser extension packaging.
#
# Usage:
#   ./scripts/deploy.sh
#
# Prerequisites:
#   - Azure CLI authenticated (az login)
#   - wasm-pack, Fastlane, and Apple Developer credentials (for full deploy)
set -e

echo "🚀 Starting Lazynext Platform Deployment..."

# 1. Verify Azure CLI Authentication
echo "🔍 Checking Azure Authentication..."
if ! az account show > /dev/null 2>&1; then
    echo "❌ You are not logged into Azure."
    echo "Please run 'az login' before running this script."
    exit 1
fi
echo "✅ Authenticated with Azure."

# 2. Deploy Azure Infrastructure (Terraform)
echo "☁️ Deploying Azure Infrastructure..."

echo ""
echo "⚠️ Your Azure for Students subscription has region restrictions."
echo "Please enter a region allowed by your subscription (e.g., 'centralus', 'westus2', 'westeurope', 'centralindia'):"
read -p "> " AZURE_REGION

if [ -z "$AZURE_REGION" ]; then
    AZURE_REGION="centralus"
    echo "No region provided, defaulting to $AZURE_REGION."
fi

export TF_VAR_location=$AZURE_REGION

cd infra/terraform
terraform init
terraform apply -auto-approve
cd ../../
echo "✅ Azure Infrastructure Provisioned."

# 3. Build WebAssembly (Web Platform)
echo "🕸️ Compiling Rust Core to WebAssembly..."
cd rust/core
wasm-pack build --target web --out-dir ../../apps/web/pkg
cd ../../
echo "✅ WASM Built. Push to GitHub to trigger the Next.js deployment to Vercel/Azure Static Web Apps."

# 4. Build Mobile Apps (Fastlane)
echo "📱 Building Mobile Apps (iOS & Android)..."
if [ -d "apps/mobile/ios" ]; then
    echo "Triggering iOS Beta deployment..."
    cd apps/mobile
    fastlane ios beta || echo "⚠️ iOS Fastlane failed (Check Apple Developer credentials)."
    
    echo "Triggering Android Beta deployment..."
    fastlane android beta || echo "⚠️ Android Fastlane failed (Check Google Play credentials)."
    cd ../../
else
    echo "⚠️ React Native 'ios' directory not found. Skipping mobile fastlane."
fi

# 5. Sign Desktop App (macOS)
echo "💻 Codesigning Desktop Application..."
if [ -f "apps/desktop/scripts/codesign.sh" ]; then
    # In a real environment, you need your Apple Developer ID
    # ./apps/desktop/scripts/codesign.sh
    echo "✅ Desktop codesign script is ready (run manually with Apple Developer ID)."
else
    echo "⚠️ Desktop codesign script not found."
fi

# 6. Browser Extension
echo "🧩 Browser Extension..."
echo "✅ The Extension is ready in apps/extension/."
echo "Please zip it and upload to the Chrome Web Store along with apps/extension/PRIVACY_POLICY.md."

echo "🎉 Deployment Orchestration Complete!"
