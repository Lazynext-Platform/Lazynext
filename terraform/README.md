# Terraform Infrastructure as Code

> **Status (2026-06-30):** Not yet implemented. This directory will contain
> Azure infrastructure-as-code for Container Apps, PostgreSQL Flexible Server,
> Blob Storage, Key Vault, and VNet configuration.
>
> See `k8s/` for active Kubernetes deployment configs and `ansible/` for
> bare-metal node provisioning.

## Planned Structure

```
terraform/
├── main.tf              # Azure provider, resource group, backend
├── network.tf           # VNet, subnets, NSGs
├── database.tf          # PostgreSQL Flexible Server
├── storage.tf           # Blob Storage + CDN
├── container-apps.tf    # Container Apps + revisions
├── keyvault.tf          # Key Vault secrets
├── monitoring.tf        # Azure Monitor + Container Insights
├── variables.tf         # Input variables
├── outputs.tf           # Output values
└── terraform.tfvars     # Variable values (gitignored)
```
