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
    web               = azurerm_container_app.web.latest_revision_fqdn
    ai_agents         = azurerm_container_app.ai_agents.latest_revision_fqdn
    render_service    = azurerm_container_app.render_service.latest_revision_fqdn
    pre_processing    = azurerm_container_app.pre_processing.latest_revision_fqdn
    generative_studio = azurerm_container_app.generative_studio.latest_revision_fqdn
  }
}

# AKS not available on Azure for Students — requires Premium tier.
# To enable AKS for production: az account upgrade or use Pay-As-You-Go subscription.

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

# ── Redis Cache ─────────────────────────────────────────────────────────────
# Redis managed via Upstash (UPSTASH_REDIS_URL) — no Azure Redis provisioned

# ── CDN / Front Door ────────────────────────────────────────────────────────

output "cdn_endpoint_hostname" {
  description = "Azure Front Door endpoint hostname"
  value       = azurerm_cdn_frontdoor_endpoint.media.host_name
}

output "cdn_profile_name" {
  description = "Azure Front Door profile name"
  value       = azurerm_cdn_frontdoor_profile.media.name
}

output "media_cdn_fqdn" {
  description = "Full media CDN URL (custom domain)"
  value       = "https://${var.media_custom_domain}"
}

# ── Application Gateway / WAF ───────────────────────────────────────────────

output "app_gateway_public_ip" {
  description = "Application Gateway public IP address"
  value       = azurerm_public_ip.app_gateway.ip_address
}

output "app_gateway_fqdn" {
  description = "Application Gateway public FQDN"
  value       = azurerm_public_ip.app_gateway.fqdn
}

output "app_gateway_id" {
  description = "Application Gateway resource ID"
  value       = azurerm_application_gateway.main.id
}

output "waf_policy_id" {
  description = "WAF policy resource ID"
  value       = azurerm_web_application_firewall_policy.main.id
}

# ── Backup ──────────────────────────────────────────────────────────────────

output "recovery_services_vault_name" {
  description = "Recovery Services Vault name"
  value       = azurerm_recovery_services_vault.main.name
}

output "backup_vault_name" {
  description = "Data Protection Backup Vault name"
  value       = azurerm_data_protection_backup_vault.main.name
}

output "backup_vault_id" {
  description = "Data Protection Backup Vault resource ID"
  value       = azurerm_data_protection_backup_vault.main.id
}

# ── Monitoring ──────────────────────────────────────────────────────────────

output "application_insights_instrumentation_keys" {
  description = "Application Insights instrumentation key by service"
  value = {
    for k, v in azurerm_application_insights.service :
    k => v.instrumentation_key
  }
  sensitive = true
}

output "application_insights_connection_strings" {
  description = "Application Insights connection string by service"
  value = {
    for k, v in azurerm_application_insights.service :
    k => v.connection_string
  }
  sensitive = true
}

output "log_analytics_workspace_id" {
  description = "Log Analytics Workspace resource ID"
  value       = azurerm_log_analytics_workspace.container_apps.id
}

output "action_group_id" {
  description = "Azure Monitor Action Group resource ID"
  value       = azurerm_monitor_action_group.main.id
}

# ── Private Endpoints ───────────────────────────────────────────────────────

output "private_endpoint_acr_ip" {
  description = "ACR private endpoint private IP address"
  value       = azurerm_private_endpoint.acr.private_service_connection[0].private_ip_address
}

output "private_endpoint_keyvault_ip" {
  description = "Key Vault private endpoint private IP address"
  value       = azurerm_private_endpoint.keyvault.private_service_connection[0].private_ip_address
}

output "private_endpoint_blob_ip" {
  description = "Storage blob private endpoint private IP address"
  value       = azurerm_private_endpoint.blob.private_service_connection[0].private_ip_address
}
