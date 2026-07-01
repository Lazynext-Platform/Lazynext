# Infrastructure

Lazynext infrastructure is managed as code using **Terraform** (Azure) with an optional **Kubernetes** (AKS) deployment path.

## Directory Layout

```
infra/
├── terraform/     # Azure infrastructure as code (primary deployment target)
└── k8s/           # Kubernetes manifests for infra-level K8s resources (currently
                   # empty — see /k8s/ at repo root for workload manifests)
```

## Terraform (`infra/terraform/`)

All Azure resources are declared in Terraform (v1.10+) with remote state stored in Azure Blob Storage.

### Modules / Files

| File | Purpose |
|---|---|
| `main.tf` | Provider config, resource group, locals (container app specs, secrets, ACR repos) |
| `vnet.tf` | Virtual network, subnets, NSGs |
| `containerapps.tf` | Azure Container Apps — 8 microservices (web, ai-agents, render-service, pre-processing, generative-studio, api-gateway, collab-server, analytics-service) |
| `aks.tf.disabled` | AKS cluster (disabled — requires Pay-As-You-Go subscription) |
| `postgresql.tf` | PostgreSQL Flexible Server (v16) |
| `redis.tf` | Azure Cache for Redis Enterprise (rate limiting, session store) |
| `storage.tf` | Blob Storage for media assets |
| `acr.tf` | Azure Container Registry (8 container images) |
| `cdn.tf` | Azure Front Door CDN for media delivery |
| `keyvault.tf` | Azure Key Vault (9 secrets: auth, API keys, Stripe, Resend) |
| `waf.tf` | Application Gateway + Web Application Firewall |
| `monitoring.tf` | Application Insights (per service), Log Analytics Workspace, Action Groups |
| `backup.tf` | Recovery Services Vault + Data Protection Backup Vault |
| `private-endpoints.tf` | Private endpoints for ACR, Key Vault, and Blob Storage |
| `oidc.tf` | Workload identity federation for GitHub Actions |
| `variables.tf` | Input variables (environment, location, etc.) |
| `outputs.tf` | Terraform outputs (connection strings, FQDNs, IPs, identities) |
| `terraform.tfvars` | Variable values (gitignored, sensitive) |
| `terraform.tfvars.example` | Template for variable values |

### Key Design Decisions

- **Primary deployment**: Azure Container Apps (serverless containers, KEDA autoscaling)
- **AKS is optional**: `aks.tf.disabled` — AKS requires Premium tier subscription; Container Apps is the default
- **Managed identities**: Workload identity federation for GitHub Actions CI/CD, user-assigned identity for Container Apps → Key Vault access
- **Private networking**: Private endpoints for ACR, Key Vault, and Storage; VNet integration for Container Apps
- **Metrics**: Application Insights per service + shared Log Analytics Workspace

### Usage

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars  # fill in values
terraform init
terraform plan
terraform apply
```

## Kubernetes (`infra/k8s/`)

Reserved for infrastructure-level Kubernetes resources (cluster add-ons, ingress controllers) — currently empty. Workload Kubernetes manifests live at `/k8s/` in the repo root.
