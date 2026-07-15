# Kubernetes

Kubernetes manifests for deploying Lazynext on any standard K8s cluster. This is the optional self-managed deployment path — the primary deployment uses Docker Compose + systemd on Linode (see `infra/linode/`).

## Why K8s Exists

Docker Compose is the default deployment target. These K8s manifests provide an alternative for:
- On-premises or hybrid deployments
- Self-managed K8s clusters with GPU node pools
- Teams that need full K8s primitives (network policies, custom scheduling, GPU node pools)

## Directory Layout

```
k8s/
├── base/                          # Kustomize base
│   ├── kustomization.yaml         # Kustomize entry point — lists all resources
│   ├── namespace.yaml             # lazynext namespace (pod-security: restricted)
│   ├── secrets.yaml               # Secrets references
│   ├── configmap.yaml             # Application configuration
│   ├── databases.yaml             # PostgreSQL + Redis StatefulSets
│   ├── services.yaml              # ClusterIP Services for microservices
│   ├── networking.yaml            # Network policies (zero-trust default-deny)
│   ├── autoscaling.yaml           # KEDA + HPAs (per-service scaling rules)
│   ├── budgets.yaml               # Pod Disruption Budgets
│   ├── backups.yaml               # Backup schedules
│   ├── monitoring.yaml            # ServiceMonitors for Prometheus Operator
│   ├── redis-configmap.yaml       # Redis configuration
│   ├── security-policies.yaml     # Pod Security Standards
│   ├── rbac.yaml                  # RBAC roles and bindings
│   ├── pgbouncer.yaml             # PgBouncer connection pooling
│   ├── model-warmup.yaml          # ML model warmup init containers
│   ├── gpu.yaml                   # GPU node selectors, tolerations, NVIDIA runtime
│   ├── ingress.yaml               # Ingress resources
│   ├── cert-manager.yaml          # Let's Encrypt ClusterIssuer
│   ├── keda.yaml                  # KEDA ScaledObjects
│   ├── fluentbit.yaml             # Fluent Bit log forwarder (DaemonSet)
│   ├── sealed-secrets.yaml        # Sealed Secrets controller
│   ├── service-mesh.yaml          # Service mesh annotations
│   ├── init-containers.yaml       # Init container patches (strategic merge)
│   ├── collab-server-deployment.yaml
│   ├── collab-server-networkpolicy.yaml
│   └── collab-server-ingress.yaml
├── overlays/                      # Environment-specific overlays
│   ├── dev/
│   ├── staging/
│   └── production/
└── ha/                            # High availability configurations
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

Container images are pulled from GitHub Container Registry (`ghcr.io/lazynext-platform/`):

| Service | Image |
|---|---|
| `lazynext-web` | `ghcr.io/lazynext-platform/lazynext-web` |
| `lazynext-ai-agents` | `ghcr.io/lazynext-platform/lazynext-ai-agents` |
| `lazynext-render-service` | `ghcr.io/lazynext-platform/lazynext-render-service` |
| `lazynext-pre-processing` | `ghcr.io/lazynext-platform/lazynext-pre-processing` |
| `lazynext-generative-studio` | `ghcr.io/lazynext-platform/lazynext-generative-studio` |
| `lazynext-mcp` | `ghcr.io/lazynext-platform/lazynext-mcp` |
| `lazynext-analytics-service` | `ghcr.io/lazynext-platform/lazynext-analytics-service` |

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

## Relationship to Linode

Docker Compose (`infra/linode/`) provisions the infrastructure (PostgreSQL, Redis, Caddy). These K8s manifests deploy the application workloads onto any conformant K8s cluster. The two are complementary — Docker Compose for infra, K8s for workloads.
