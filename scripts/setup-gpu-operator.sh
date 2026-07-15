#!/usr/bin/env bash
# ───────────────────────────────────────────────────────────────────
# Lazynext — NVIDIA GPU Operator Setup
# ───────────────────────────────────────────────────────────────────
# Installs the NVIDIA GPU Operator on an LKE cluster with GPU nodes.
# This enables GPU scheduling, monitoring (DCGM), and MIG support.
#
# Prerequisites:
#   1. LKE cluster with GPU node pool
#   2. kubectl configured for the target cluster
#   3. Helm 3 installed
#
# Usage:
#   chmod +x scripts/setup-gpu-operator.sh
#   ./scripts/setup-gpu-operator.sh
#   ./scripts/setup-gpu-operator.sh --release 24.6.2
# ───────────────────────────────────────────────────────────────────

set -euo pipefail

NAMESPACE="${GPU_OPERATOR_NAMESPACE:-gpu-operator}"
RELEASE="${GPU_OPERATOR_VERSION:-24.6.2}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --release)   RELEASE="$2"; shift 2 ;;
    --help)      echo "Usage: $0 [--namespace gpu-operator] [--release 24.6.2]"; exit 0 ;;
    *) err "Unknown flag: $1" ;;
  esac
done

echo "=============================================="
echo " Lazynext — GPU Operator Setup"
echo " Namespace: ${NAMESPACE}"
echo " Release:   ${RELEASE}"
echo "=============================================="
echo

# ── Check prerequisites ───────────────────────────────────────────
command -v helm >/dev/null 2>&1 || err "helm is required but not installed"
command -v kubectl >/dev/null 2>&1 || err "kubectl is required but not installed"

# Check if connected to a cluster
if ! kubectl cluster-info &>/dev/null; then
  warn "Not connected to a Kubernetes cluster."
  echo "Run: linode-cli lke kubeconfig-view <cluster-id> | ... to configure kubectl"
  log "Skipping GPU Operator install (no cluster). Config is ready in k8s/base/gpu.yaml"
  exit 0
fi

# Check for GPU nodes — GPU Operator only works on nodes with NVIDIA hardware
GPU_NODES=$(kubectl get nodes -l nvidia.com/gpu=true -o name 2>/dev/null | wc -l | tr -d ' ')
if [[ "$GPU_NODES" -eq 0 ]]; then
  warn "No GPU nodes found in cluster (missing label: nvidia.com/gpu=true)."
  echo
  echo "The NVIDIA GPU Operator requires nodes with physical NVIDIA GPUs."
  echo "For LKE, create a GPU node pool first:"
  echo "  GPU node pool created via Linode GPU instances"
  echo
  log "Skipping GPU Operator install (no GPU hardware detected)"
  log "GPU manifests and ClusterPolicy are ready in k8s/base/gpu.yaml"
  log "Run this script on the LKE cluster after GPU nodes are provisioned"
  exit 0
fi

# ── Add Helm repo ──────────────────────────────────────────────────
echo "Step 1/4: Adding NVIDIA Helm repo..."
helm repo add nvidia https://helm.ngc.nvidia.com/nvidia 2>/dev/null || \
  warn "NVIDIA repo already added, updating..."
helm repo update nvidia
log "NVIDIA Helm repo ready"

# ── Create namespace ──────────────────────────────────────────────
echo "Step 2/4: Creating namespace..."
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
log "Namespace ${NAMESPACE} ready"

# ── Install GPU Operator ──────────────────────────────────────────
echo "Step 3/4: Installing GPU Operator ${RELEASE}..."
helm upgrade --install gpu-operator nvidia/gpu-operator \
  --namespace "${NAMESPACE}" \
  --version "${RELEASE}" \
  --set driver.enabled=true \
  --set driver.version=550.90.07 \
  --set toolkit.enabled=true \
  --set toolkit.version=1.15.0-ubuntu20.04 \
  --set devicePlugin.enabled=true \
  --set dcgm.enabled=true \
  --set dcgmExporter.enabled=true \
  --set dcgmExporter.serviceMonitor.enabled=true \
  --set operator.defaultRuntime=containerd \
  --wait \
  --timeout 10m
log "GPU Operator installed"

# ── Apply ClusterPolicy ───────────────────────────────────────────
echo "Step 4/4: Applying ClusterPolicy..."
kubectl apply -f k8s/base/gpu.yaml
log "ClusterPolicy applied"

# ── Verify ────────────────────────────────────────────────────────
echo
echo "=============================================="
log "GPU Operator setup complete!"
echo
echo "Verify GPU nodes:"
echo "  kubectl get nodes -l nvidia.com/gpu=true"
echo
echo "Verify GPU pods can schedule:"
echo "  kubectl describe node -l nvidia.com/gpu=true | grep nvidia.com/gpu"
echo
echo "Verify DCGM metrics:"
echo "  kubectl port-forward -n ${NAMESPACE} svc/gpu-operator-dcgm-exporter 9400:9400"
echo "  curl http://localhost:9400/metrics | grep DCGM"
echo "=============================================="
