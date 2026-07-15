#!/usr/bin/env bash
set -euo pipefail

# ── Lazynext Docker Build & Push ─────────────────────────────────────
# Builds all 9 service images and pushes to the configured registry.
#
# Usage:
#   ./scripts/docker-build.sh                              # build for local testing
#   ./scripts/docker-build.sh --push                       # build + push to GHCR
#   ./scripts/docker-build.sh --push --registry myreg.com  # build + push to custom registry
#   ./scripts/docker-build.sh --gpu                        # build GPU-enabled variants
#
# Environment:
#   DOCKER_REGISTRY    — Registry host (default: GHCR or localhost)
#   DOCKER_TAG         — Image tag (default: latest)
#   BUILD_PARALLEL     — Run builds in parallel (default: 1)
#   SKIP_RUST_BUILD    — Skip Rust service builds (default: 0)

readonly REGISTRY="${DOCKER_REGISTRY:-}"
readonly TAG="${DOCKER_TAG:-latest}"
readonly PARALLEL="${BUILD_PARALLEL:-1}"
readonly SKIP_RUST="${SKIP_RUST_BUILD:-0}"

PUSH=false
GPU=false

for arg in "$@"; do
  case "$arg" in
    --push) PUSH=true ;;
    --gpu) GPU=true ;;
  esac
done

# Auto-detect GHCR registry
if [[ -z "$REGISTRY" ]] && $PUSH; then
  REGISTRY="ghcr.io/lazynext-platform"
fi

green() { printf '\033[32m%s\033[0m\n' "$*"; }
red()   { printf '\033[31m%s\033[0m\n' "$*"; }

build_and_push() {
  local name="$1"
  local dockerfile="$2"
  local context="$3"
  local extra_args="${4:-}"

  local image="$name:$TAG"
  [[ -n "$REGISTRY" ]] && image="$REGISTRY/$image"

  echo "Building $image..."
  if docker build $extra_args -t "$image" -f "$dockerfile" "$context"; then
    green "  ✓ $name built"
  else
    red "  ✗ $name FAILED"
    return 1
  fi

  if $PUSH; then
    echo "Pushing $image..."
    docker push "$image" && green "  ↑ pushed"
  fi
}

main() {
  echo "╔══════════════════════════════════════════════════════════╗"
  echo "║       Lazynext Docker Build & Push                      ║"
  echo "╠══════════════════════════════════════════════════════════╣"
  echo "║ Registry: ${REGISTRY:-local}"
  echo "║ Tag:      $TAG"
  echo "║ GPU:      $GPU"
  echo "║ Push:     $PUSH"
  echo "╚══════════════════════════════════════════════════════════╝"
  echo ""

  local failures=0

  # Core Rust builder (shared base)
  build_and_push "lazynext-rust-builder" "Dockerfile.rust-builder" "." || ((failures++))

  # Web App (needs root context for package.json)
  build_and_push "lazynext-web" "apps/web/Dockerfile" "." "--build-arg NEXT_PUBLIC_API_URL=http://api-gateway:8005" || ((failures++))

  # API Gateway (Rust — needs root context for Cargo.toml)
  if [[ "$SKIP_RUST" != "1" ]]; then
    build_and_push "lazynext-api-gateway" "rust/api-gateway/Dockerfile" "." || ((failures++))
  fi

  # AI Agents (Node.js)
  build_and_push "lazynext-ai-agents" "services/ai-agents/Dockerfile" "services/ai-agents" || ((failures++))

  # Render Service (Node.js)
  build_and_push "lazynext-render-service" "services/render-service/Dockerfile" "services/render-service" || ((failures++))

  # Pre-Processing (Python)
  if $GPU; then
    build_and_push "lazynext-pre-processing" "services/pre-processing/Dockerfile.gpu" "services/pre-processing" || ((failures++))
  else
    build_and_push "lazynext-pre-processing" "services/pre-processing/Dockerfile" "services/pre-processing" || ((failures++))
  fi

  # Generative Studio (Python)
  if $GPU; then
    build_and_push "lazynext-generative-studio" "services/generative-studio/Dockerfile.gpu" "services/generative-studio" || ((failures++))
  else
    build_and_push "lazynext-generative-studio" "services/generative-studio/Dockerfile" "services/generative-studio" || ((failures++))
  fi

  # Collab Server (Rust — needs root context for Cargo.toml)
  if [[ "$SKIP_RUST" != "1" ]]; then
    build_and_push "lazynext-collab-server" "services/collab-server/Dockerfile" "." || ((failures++))
  fi

  # Analytics Service (Node.js)
  build_and_push "lazynext-analytics-service" "services/analytics-service/Dockerfile" "services/analytics-service" || ((failures++))

  # MCP Server (Rust)
  if [[ "$SKIP_RUST" != "1" ]]; then
    build_and_push "lazynext-mcp" "rust/mcp-server/Dockerfile" "." || ((failures++))
  fi

  # Database Migration
  build_and_push "lazynext-migrate" "Dockerfile.migrate" "." || ((failures++))

  echo ""
  if [[ "$failures" -eq 0 ]]; then
    green "All images built successfully!"
  else
    red "$failures image(s) failed to build"
    exit 1
  fi
}

main
