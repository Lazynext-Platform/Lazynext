# ── Terraform Outputs ───────────────────────────────────────────────────────

output "resource_group_name" {
  description = "Azure resource group name"
  value       = azurerm_resource_group.rg.name
}

output "location" {
  description = "Azure region"
  value       = azurerm_resource_group.rg.location
}

# ── Networking ──────────────────────────────────────────────────────────────

output "vnet_id" {
  description = "Virtual Network ID"
  value       = azurerm_virtual_network.vnet.id
}

output "vnet_name" {
  description = "Virtual Network name"
  value       = azurerm_virtual_network.vnet.name
}

# ── PostgreSQL ──────────────────────────────────────────────────────────────

output "postgres_fqdn" {
  description = "PostgreSQL Flexible Server FQDN"
  value       = azurerm_postgresql_flexible_server.postgres.fqdn
}

output "postgres_connection_string" {
  description = "PostgreSQL connection string (password masked)"
  value       = "postgresql://lazynext_app:<password>@${azurerm_postgresql_flexible_server.postgres.fqdn}:5432/lazynext"
  sensitive   = true
}

# ── Blob Storage ────────────────────────────────────────────────────────────

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.media.name
}

output "media_container_name" {
  description = "Media blob container name"
  value       = azurerm_storage_container.media.name
}

# ── Container Registry ──────────────────────────────────────────────────────

output "acr_login_server" {
  description = "ACR login server URL"
  value       = azurerm_container_registry.acr.login_server
}

output "acr_admin_username" {
  description = "ACR admin username"
  value       = azurerm_container_registry.acr.admin_username
  sensitive   = true
}

# ── Container Apps ──────────────────────────────────────────────────────────

output "container_app_urls" {
  description = "URLs for all Container Apps"
  value = {
    web                = azurerm_container_app.web.latest_revision_fqdn
    ai_agents          = azurerm_container_app.ai_agents.latest_revision_fqdn
    render_service     = azurerm_container_app.render_service.latest_revision_fqdn
    pre_processing     = azurerm_container_app.pre_processing.latest_revision_fqdn
    generative_studio  = azurerm_container_app.generative_studio.latest_revision_fqdn
  }
}

# ── AKS ─────────────────────────────────────────────────────────────────────

output "aks_cluster_name" {
  description = "AKS cluster name"
  value       = azurerm_kubernetes_cluster.aks.name
}

output "aks_oidc_issuer_url" {
  description = "AKS OIDC issuer URL (for Workload Identity)"
  value       = azurerm_kubernetes_cluster.aks.oidc_issuer_url
}

output "aks_kubeconfig" {
  description = "AKS kubeconfig (sensitive)"
  value       = azurerm_kubernetes_cluster.aks.kube_config_raw
  sensitive   = true
}

# ── Key Vault ───────────────────────────────────────────────────────────────

output "key_vault_name" {
  description = "Key Vault name"
  value       = azurerm_key_vault.secrets.name
}

output "key_vault_uri" {
  description = "Key Vault URI"
  value       = azurerm_key_vault.secrets.vault_uri
}

# ── Managed Identities ──────────────────────────────────────────────────────

output "container_apps_identity_client_id" {
  description = "Container Apps managed identity client ID"
  value       = azurerm_user_assigned_identity.container_apps.client_id
}

output "github_actions_identity_client_id" {
  description = "GitHub Actions managed identity client ID (for az login)"
  value       = azurerm_user_assigned_identity.github_actions.client_id
}

output "tenant_id" {
  description = "Azure AD tenant ID"
  value       = data.azurerm_client_config.current.tenant_id
}
