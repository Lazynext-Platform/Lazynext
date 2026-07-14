# ─────────────────────────────────────────────────────────────────────────────
# Core Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "southeastasia"
}

variable "environment" {
  description = "Deployment environment: dev, staging, or production"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod, production."
  }
}

variable "app_domain" {
  description = "The public domain of the Lazynext web app (primary domain)"
  type        = string
  default     = "lazynext.com"
}

variable "domain_name" {
  description = "Primary domain for DNS zone and TLS certificates"
  type        = string
  default     = "lazynext.com"
}

variable "create_dns_zone" {
  description = "Provision an Azure DNS zone for the domain (set false if using external DNS)"
  type        = bool
  default     = false
}

# ─────────────────────────────────────────────────────────────────────────────
# AKS
# ─────────────────────────────────────────────────────────────────────────────

variable "kubernetes_version" {
  description = "Kubernetes version for AKS"
  type        = string
  default     = "1.32"
}

variable "node_count" {
  description = "Number of nodes in default AKS node pool"
  type        = number
  default     = 2
}

# ─────────────────────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────────────────────

variable "db_password" {
  description = "Password for the PostgreSQL admin user"
  type        = string
  sensitive   = true
  default     = "UNSET_SECRET"
}

variable "db_sku_name" {
  description = "PostgreSQL Flexible Server SKU"
  type        = string
  default     = "B_Standard_B1ms" # Burstable, 1 vCore, 2 GiB RAM (dev)
}

# ─────────────────────────────────────────────────────────────────────────────
# Application Secrets
# ─────────────────────────────────────────────────────────────────────────────

variable "better_auth_secret" {
  description = "Secret key for Better Auth (64+ chars recommended)"
  type        = string
  sensitive   = true
  default     = "UNSET_SECRET"
}

# ─────────────────────────────────────────────────────────────────────────────
# API Keys
# ─────────────────────────────────────────────────────────────────────────────

variable "gemini_api_key" {
  description = "API key for Google Gemini"
  type        = string
  sensitive   = true
  default     = "UNSET_SECRET"
}

variable "dodo_api_key" {
  description = "Dodo Payments API key for payment processing"
  type        = string
  sensitive   = true
  default     = "UNSET_SECRET"
}

variable "dodo_webhook_secret" {
  description = "Dodo Payments webhook signing secret"
  type        = string
  sensitive   = true
  default     = "UNSET_SECRET"
}

variable "resend_api_key" {
  description = "Resend API key for transactional email"
  type        = string
  sensitive   = true
  default     = "UNSET_SECRET"
}

variable "ssl_cert_secret_id" {
  description = "Key Vault secret ID for the TLS/SSL certificate (HTTPS). Set before production deploy."
  type        = string
  default     = ""
}

# ─────────────────────────────────────────────────────────────────────────────
# LLM Configuration
# ─────────────────────────────────────────────────────────────────────────────

variable "llm_provider" {
  description = "Default LLM provider for the Lazynext AI Copilot"
  type        = string
  default     = "anthropic"

  validation {
    condition     = contains(["openai", "anthropic", "gemini"], var.llm_provider)
    error_message = "LLM provider must be one of: openai, anthropic, gemini."
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Redis Cache
# ─────────────────────────────────────────────────────────────────────────────

variable "redis_sku_name" {
  description = "Azure Cache for Redis Enterprise SKU name"
  type        = string
  default     = "Enterprise_E10" # 12 GB per shard

  validation {
    condition = contains([
      "Enterprise_E10", "Enterprise_E20", "Enterprise_E50", "Enterprise_E100",
      "EnterpriseFlash_F300", "EnterpriseFlash_F700", "EnterpriseFlash_F1500",
    ], var.redis_sku_name)
    error_message = "Redis SKU must be a valid Enterprise tier SKU."
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Storage
# ─────────────────────────────────────────────────────────────────────────────

variable "storage_public_network_access_enabled" {
  description = "Allow public network access to the storage account. Set to false when private endpoints are provisioned."
  type        = bool
  default     = false
}

# ─────────────────────────────────────────────────────────────────────────────
# CDN / Front Door
# ─────────────────────────────────────────────────────────────────────────────

variable "cdn_sku_name" {
  description = "Azure Front Door SKU name"
  type        = string
  default     = "Standard_AzureFrontDoor"

  validation {
    condition = contains([
      "Standard_AzureFrontDoor", "Premium_AzureFrontDoor",
    ], var.cdn_sku_name)
    error_message = "CDN SKU must be Standard_AzureFrontDoor or Premium_AzureFrontDoor."
  }
}

variable "cdn_enabled" {
  description = "Enable Azure Front Door CDN (disabled for Free Trial accounts)"
  type        = bool
  default     = true
}

variable "media_custom_domain" {
  description = "Custom domain for the media CDN endpoint"
  type        = string
  default     = "media.lazynext.com"
}

# ─────────────────────────────────────────────────────────────────────────────
# Monitoring / Alerts
# ─────────────────────────────────────────────────────────────────────────────

variable "cdn_dns_zone_id" {
  description = "Azure DNS Zone resource ID for custom domain validation (leave empty to manage DNS manually)"
  type        = string
  default     = ""
}

variable "alert_email_address" {
  description = "Primary email address for Azure Monitor alert notifications"
  type        = string
  default     = "alerts@lazynext.ai"
}

variable "alert_slack_webhook_url" {
  description = "Slack incoming webhook URL for alert notifications (leave empty to disable)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "alert_pagerduty_integration_key" {
  description = "PagerDuty Events API v2 integration key (leave empty to disable)"
  type        = string
  sensitive   = true
  default     = ""
}

# ─────────────────────────────────────────────────────────────────────────────
# Application Gateway / WAF
# ─────────────────────────────────────────────────────────────────────────────

variable "app_gateway_sku_tier" {
  description = "Application Gateway SKU tier"
  type        = string
  default     = "WAF_v2"

  validation {
    condition     = contains(["WAF_v2", "Standard_v2"], var.app_gateway_sku_tier)
    error_message = "Application Gateway tier must be WAF_v2 or Standard_v2."
  }
}

variable "app_gateway_capacity" {
  description = "Application Gateway instance count (capacity units for v2 SKU)"
  type        = number
  default     = 2
}

variable "app_gateway_subnet_prefix" {
  description = "Address prefix for the Application Gateway subnet"
  type        = list(string)
  default     = ["10.0.1.0/24"]
}

# ─────────────────────────────────────────────────────────────────────────────
# Backup
# ─────────────────────────────────────────────────────────────────────────────

variable "backup_retention_days" {
  description = "Number of days to retain Recovery Services Vault backups"
  type        = number
  default     = 30
}

variable "backup_policy_time" {
  description = "Daily backup schedule time (UTC, 24h format)"
  type        = string
  default     = "02:00"
}

variable "enable_backup" {
  description = <<-EOT
    Whether to provision the Azure Backup stack (Recovery Services Vault,
    Data Protection Backup Vault, backup policies/instances, and their role
    assignments). Disabled by default because it requires elevated
    (roleAssignments/write) permissions and a backup vault that conflicts
    with region moves via soft-delete. Enable once the subscription/service
    principal supports it.
  EOT
  type        = bool
  default     = false
}

variable "enable_cdn" {
  description = <<-EOT
    Whether to provision Azure Front Door / CDN + WAF. Disabled by default
    because Azure Front Door is not available on Free/Student subscriptions.
    Enable on a Pay-As-You-Go (or higher) subscription.
  EOT
  type        = bool
  default     = false
}

variable "enable_role_assignments" {
  description = <<-EOT
    Whether to create Azure role assignments (ACR pull, blob access, etc.).
    Requires the deploying service principal to have
    'Microsoft.Authorization/roleAssignments/write' (User Access
    Administrator or Owner). Disabled by default for least-privilege
    service principals; Container Apps fall back to ACR admin credentials.
  EOT
  type        = bool
  default     = false
}

variable "enable_application_gateway" {
  description = <<-EOT
    Whether to provision the Application Gateway (WAF v2) for centralized
    TLS termination and host-based routing. Requires the WAF_v2 SKU to be
    available in the target region, which is NOT supported on Azure for
    Students subscriptions. Set to true only after upgrading to a paid
    subscription or receiving a SKU exception.
  EOT
  type        = bool
  default     = false
}
