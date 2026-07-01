# Kubernetes

Kubernetes manifests for deploying Lazynext on **AKS** (Azure Kubernetes Service) or any standard K8s cluster. This is the optional self-managed deployment path — the primary deployment uses Azure Container Apps provisioned via Terraform.

## Why K8s Exists

Azure Container Apps is the default deployment target (see `infra/terraform/containerapps.tf`). These K8s manifests provide an alternative for:
- On-premises or hybrid deployments
- AKS clusters (requires Pay-As-You-Go subscription — disabled in Terraform via `aks.tf.disabled`)
- Teams that need full K8s primitives (network policies, custom scheduling, GPU node pools)

## Directory Layout

```
k8s/
├── base/                          # Kustomize base (29 manifests)
│   ├── kustomization.yaml         # Kustomize entry point — lists all resources
│   ├── namespace.yaml             # lazynext namespace (pod-security: restricted)
│   ├── secrets.yaml               # Sealed Secrets references
│   ├── configmap.yaml             # Application configuration
│   ├── databases.yaml             # PostgreSQL + Redis StatefulSets
│   ├── services.yaml              # ClusterIP Services for microservices
│   ├── networking.yaml            # Network policies (zero-trust default-deny)
│   ├── autoscaling.yaml           # KEDA + HPAs (per-service scaling rules)
│   ├── budgets.yaml               # Pod Disruption Budgets
│   ├── backups.yaml               # Velero backup schedules
│   ├── monitoring.yaml            # ServiceMonitors for Prometheus Operator
│   ├── redis-configmap.yaml       # Redis configuration
│   ├── security-policies.yaml     # Pod Security Standards + OPA constraints
│   ├── rbac.yaml                  # RBAC roles and bindings
│   ├── pgbouncer.yaml             # PgBouncer connection pooling
│   ├── model-warmup.yaml          # ML model warmup init containers
│   ├── gpu.yaml                   # GPU node selectors, tolerations, NVIDIA runtime
│   ├── ingress.yaml               # Ingress resources (collab-server, web)
│   ├── cert-manager.yaml          # Let's Encrypt ClusterIssuer
│   ├── keda.yaml                  # KEDA ScaledObjects
│   ├── fluentbit.yaml             # Fluent Bit log forwarder (DaemonSet)
│   ├── sealed-secrets.yaml        # Sealed Secrets controller
│   ├── velero.yaml                # Velero backup CRDs
│   ├── service-mesh.yaml          # Linkerd / Istio annotations
│   ├── init-containers.yaml       # Init container patches (strategic merge)
│   ├── collab-server-deployment.yaml   # CRDT collaboration server deployment
│   ├── collab-server-networkpolicy.yaml
│   ├── collab-server-ingress.yaml
│   └── analytics-service-networkpolicy.yaml
├── overlays/                      # Environment-specific overlays
│   ├── dev/
│   ├── staging/
│   └── production/
└── ha/                            # High availability configurations
    └── patroni-values.yaml        # Patroni PostgreSQL HA operator values
```

## Kustomize Overlays

The `base/` directory contains the common configuration. Environment overlays in `overlays/` patch the base for dev, staging, and production:

```
k8s/overlays/
├── dev/          # Reduced replicas, ephemeral storage, debug logging
├── staging/      # Mirror of production at smaller scale
└── production/   # Full-scale deployment with HA
```

## Image Sources

Container images are pulled from Azure Container Registry (`lazynextacrdevlmblwn.azurecr.io/`). The `base/kustomization.yaml` transforms image references from `ghcr.io/lazynext-platform/*` to ACR:

| Service | ACR Image |
|---|---|
| `lazynext-web` | `lazynext-web` |
| `lazynext-ai-agents` | `lazynext-ai-agents` |
| `lazynext-render-service` | `lazynext-render-service` |
| `lazynext-pre-processing` | `lazynext-pre-processing` |
| `lazynext-generative-studio` | `lazynext-generative-studio` |
| `lazynext-mcp` | `lazynext-mcp` |
| `lazynext-analytics-service` | `lazynext-analytics-service` |

## High Availability (`ha/`)

`patroni-values.yaml` configures the Patroni operator for PostgreSQL HA with automatic failover. Used when running PostgreSQL inside the cluster instead of Azure Flexible Server.

## Usage

```bash
# Preview rendered manifests for production
kubectl kustomize k8s/overlays/production

# Apply to cluster
kubectl apply -k k8s/overlays/production

# Delete
kubectl delete -k k8s/overlays/production
```

## Security Posture

- **Pod Security Standards**: `restricted` enforced at namespace level
- **Network policies**: Default-deny with explicit allow rules per service
- **Sealed Secrets**: Encrypted secrets stored in Git via Bitnami Sealed Secrets
- **RBAC**: Least-privilege roles for service accounts
- **Image policy**: ACR with vulnerability scanning

## Relationship to Terraform

Terraform (`infra/terraform/`) provisions the Azure infrastructure (VNet, PostgreSQL, Redis, ACR, Key Vault). These K8s manifests deploy the application workloads onto either an AKS cluster (if enabled) or any conformant K8s cluster. The two are complementary — Terraform for infra, K8s for workloads.
