// ── Docker Buildx Bake ─────────────────────────────────────────
// Builds ALL Lazynext Docker images with multi-arch support.
//
// Usage:
//   docker buildx bake                    # Build all images (current arch)
//   docker buildx bake --push             # Build + push all images
//   docker buildx bake web                # Build only the web app
//   docker buildx bake --set *.platform=linux/amd64,linux/arm64  # Multi-arch

variable "REGISTRY" {
  default = "ghcr.io/lazynext-platform"
}

variable "TAG" {
  default = "latest"
}

variable "GIT_SHA" {
  default = ""
}

variable "PLATFORMS" {
  default = "linux/amd64"
}

group "default" {
  targets = [
    "web",
    "ai-agents",
    "render-service",
    "pre-processing",
    "generative-studio",
    "db-migrate",
    "collab-server",
    "analytics-service",
    "api-gateway",
  ]
}

group "gpu" {
  targets = [
    "pre-processing-gpu",
    "generative-studio-gpu",
    "tensorflow-serving",
  ]
}

target "web" {
  context    = "."
  dockerfile = "apps/web/Dockerfile"
  platforms  = split(",", PLATFORMS)
  tags       = ["${REGISTRY}/lazynext-web:${TAG}"]
  args = {
    BUILDKIT_INLINE_CACHE = "1"
  }
  cache-from = ["type=registry,ref=${REGISTRY}/lazynext-web:buildcache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/lazynext-web:buildcache,mode=max"]
}

target "ai-agents" {
  context    = "./services/ai-agents"
  dockerfile = "Dockerfile"
  platforms  = split(",", PLATFORMS)
  tags       = ["${REGISTRY}/lazynext-ai-agents:${TAG}"]
  cache-from = ["type=registry,ref=${REGISTRY}/lazynext-ai-agents:buildcache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/lazynext-ai-agents:buildcache,mode=max"]
}

target "render-service" {
  context    = "./services/render-service"
  dockerfile = "Dockerfile"
  platforms  = split(",", PLATFORMS)
  tags       = ["${REGISTRY}/lazynext-render-service:${TAG}"]
  cache-from = ["type=registry,ref=${REGISTRY}/lazynext-render-service:buildcache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/lazynext-render-service:buildcache,mode=max"]
}

target "pre-processing" {
  context    = "./services/pre-processing"
  dockerfile = "Dockerfile"
  platforms  = split(",", PLATFORMS)
  tags       = ["${REGISTRY}/lazynext-pre-processing:${TAG}"]
  cache-from = ["type=registry,ref=${REGISTRY}/lazynext-pre-processing:buildcache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/lazynext-pre-processing:buildcache,mode=max"]
}

target "generative-studio" {
  context    = "./services/generative-studio"
  dockerfile = "Dockerfile"
  platforms  = split(",", PLATFORMS)
  tags       = ["${REGISTRY}/lazynext-generative-studio:${TAG}"]
  cache-from = ["type=registry,ref=${REGISTRY}/lazynext-generative-studio:buildcache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/lazynext-generative-studio:buildcache,mode=max"]
}

target "db-migrate" {
  context    = "."
  dockerfile = "Dockerfile.migrate"
  platforms  = split(",", PLATFORMS)
  tags       = ["${REGISTRY}/lazynext-db-migrate:${TAG}"]
  cache-from = ["type=registry,ref=${REGISTRY}/lazynext-db-migrate:buildcache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/lazynext-db-migrate:buildcache,mode=max"]
}

target "collab-server" {
  context    = "."
  dockerfile = "services/collab-server/Dockerfile"
  platforms  = split(",", PLATFORMS)
  tags       = ["${REGISTRY}/lazynext-collab-server:${TAG}"]
  cache-from = ["type=registry,ref=${REGISTRY}/lazynext-collab-server:buildcache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/lazynext-collab-server:buildcache,mode=max"]
}

target "analytics-service" {
  context    = "./services/analytics-service"
  dockerfile = "Dockerfile"
  platforms  = split(",", PLATFORMS)
  tags       = ["${REGISTRY}/lazynext-analytics-service:${TAG}"]
  cache-from = ["type=registry,ref=${REGISTRY}/lazynext-analytics-service:buildcache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/lazynext-analytics-service:buildcache,mode=max"]
}

target "api-gateway" {
  context    = "."
  dockerfile = "rust/api-gateway/Dockerfile"
  platforms  = split(",", PLATFORMS)
  tags       = ["${REGISTRY}/lazynext-api-gateway:${TAG}"]
  cache-from = ["type=registry,ref=${REGISTRY}/lazynext-api-gateway:buildcache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/lazynext-api-gateway:buildcache,mode=max"]
}

// ── GPU Images ─────────────────────────────────────────────────

target "pre-processing-gpu" {
  context    = "./services/pre-processing"
  dockerfile = "Dockerfile.gpu"
  platforms  = ["linux/amd64"]
  tags       = ["${REGISTRY}/lazynext-pre-processing:${TAG}-gpu"]
  cache-from = ["type=registry,ref=${REGISTRY}/lazynext-pre-processing:buildcache-gpu"]
  cache-to   = ["type=registry,ref=${REGISTRY}/lazynext-pre-processing:buildcache-gpu,mode=max"]
  args = {
    BUILDKIT_INLINE_CACHE = "1"
  }
  annotations = [
    "org.opencontainers.image.source=https://github.com/lazynext-platform/lazynext",
    "org.opencontainers.image.revision=${GIT_SHA}",
  ]
}

target "generative-studio-gpu" {
  context    = "./services/generative-studio"
  dockerfile = "Dockerfile.gpu"
  platforms  = ["linux/amd64"]
  tags       = ["${REGISTRY}/lazynext-generative-studio:${TAG}-gpu"]
  cache-from = ["type=registry,ref=${REGISTRY}/lazynext-generative-studio:buildcache-gpu"]
  cache-to   = ["type=registry,ref=${REGISTRY}/lazynext-generative-studio:buildcache-gpu,mode=max"]
  args = {
    BUILDKIT_INLINE_CACHE = "1"
  }
  annotations = [
    "org.opencontainers.image.source=https://github.com/lazynext-platform/lazynext",
    "org.opencontainers.image.revision=${GIT_SHA}",
  ]
}

target "tensorflow-serving" {
  context    = "./services/pre-processing"
  dockerfile = "Dockerfile.tensorflow"
  platforms  = ["linux/amd64"]
  tags       = ["${REGISTRY}/lazynext-tf-serving:${TAG}"]
  cache-from = ["type=registry,ref=${REGISTRY}/lazynext-tf-serving:buildcache"]
  cache-to   = ["type=registry,ref=${REGISTRY}/lazynext-tf-serving:buildcache,mode=max"]
  args = {
    BUILDKIT_INLINE_CACHE = "1"
  }
  annotations = [
    "org.opencontainers.image.source=https://github.com/lazynext-platform/lazynext",
    "org.opencontainers.image.revision=${GIT_SHA}",
  ]
}
