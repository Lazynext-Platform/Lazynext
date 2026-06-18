#!/usr/bin/env bash
# sign-images.sh — Sign Docker images with Cosign (keyless via GitHub OIDC)
# Requires: cosign, docker, crane
# Usage: ./scripts/sign-images.sh [TAG]
set -euo pipefail

TAG="${1:-latest}"
REGISTRY="ghcr.io/lazynext-platform"
IMAGES=(
  "lazynext-web"
  "lazynext-ai-agents"
  "lazynext-render-service"
  "lazynext-pre-processing"
  "lazynext-generative-studio"
  "lazynext-db-migrate"
)

echo "🔐 Signing Lazynext images (tag: $TAG)..."

for image in "${IMAGES[@]}"; do
  full_image="${REGISTRY}/${image}:${TAG}"
  echo "   Signing: $full_image"

  cosign sign \
    --yes \
    --certificate-identity "https://github.com/Lazynext-Platform/Lazynext/.github/workflows/ci.yml@refs/heads/main" \
    --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
    "$full_image"

  # Verify the signature
  cosign verify \
    --certificate-identity "https://github.com/Lazynext-Platform/Lazynext/.github/workflows/ci.yml@refs/heads/main" \
    --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
    "$full_image"

  # Generate SBOM and attach
  syft "$full_image" -o spdx-json | cosign attach sbom --sbom - "$full_image" 2>/dev/null || true

  echo "   ✅ Signed: $full_image"
done

echo "✅ All images signed."
