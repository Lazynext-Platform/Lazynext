#!/usr/bin/env bash
# scan-images.sh — Vulnerability scan Docker images with Trivy
# Requires: trivy (https://github.com/aquasecurity/trivy)
# Usage: ./scripts/scan-images.sh [TAG]
set -euo pipefail

TAG="${1:-latest}"
REGISTRY="ghcr.io/lazynext-platform"
IMAGES=(
  "lazynext-web"
  "lazynext-ai-agents"
  "lazynext-render-service"
  "lazynext-pre-processing"
  "lazynext-generative-studio"
)

EXIT_CODE=0
RESULTS_DIR="./.security-scans/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo "🔍 Scanning Lazynext images (tag: $TAG)..."
echo "   Results: $RESULTS_DIR"
echo ""

for image in "${IMAGES[@]}"; do
  full_image="${REGISTRY}/${image}:${TAG}"
  echo "━━━ Scanning: $full_image ━━━"

  # Scan for vulnerabilities (block on CRITICAL only in CI)
  trivy image \
    --severity CRITICAL,HIGH \
    --ignore-unfixed \
    --format table \
    --output "$RESULTS_DIR/${image}.txt" \
    "$full_image" || true

  # JSON report for CI integration
  trivy image \
    --severity CRITICAL,HIGH,MEDIUM \
    --ignore-unfixed \
    --format sarif \
    --output "$RESULTS_DIR/${image}.sarif" \
    "$full_image" || true

  # Count criticals
  criticals=$(grep -c "CRITICAL" "$RESULTS_DIR/${image}.txt" 2>/dev/null || echo "0")
  highs=$(grep -c "HIGH" "$RESULTS_DIR/${image}.txt" 2>/dev/null || echo "0")

  echo "   📊 $full_image: $criticals CRITICAL, $highs HIGH"
  echo ""

  if [ "$criticals" -gt 0 ]; then
    EXIT_CODE=2
  fi
done

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All images pass security scan (no CRITICAL vulns)."
else
  echo "❌ CRITICAL vulnerabilities found! Review: $RESULTS_DIR"
fi

exit $EXIT_CODE
