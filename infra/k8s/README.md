# Kubernetes — AKS Deployment (Deprecated)

> ⚠️ **This directory is intentionally empty.** Lazynext has migrated from Azure Kubernetes Service to Azure Container Apps for compute orchestration.

The K8s manifests for production deployment are in the **root-level** `/k8s/` directory (29 base + overlay manifests using Kustomize).

The Terraform AKS module (`infra/terraform/aks.tf.disabled`) was disabled due to Azure for Students subscription limitations (no Premium tier access). If AKS becomes available in the future, reinstate `aks.tf.disabled` and deploy the Kustomize manifests from `/k8s/`.

See:
- `/k8s/README.md` — Kustomize deployment guide
- `/infra/terraform/containerapps.tf` — Active Container Apps configuration
