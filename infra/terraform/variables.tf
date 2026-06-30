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
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "app_domain" {
  description = "The public domain of the Lazynext web app"
  type        = string
  default     = "lazynext.ai"
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

variable "replicate_api_token" {
  description = "API token for Replicate (AI video generation)"
  type        = string
  sensitive   = true
  default     = "UNSET_SECRET"
}

variable "elevenlabs_api_key" {
  description = "API key for ElevenLabs (AI dubbing)"
  type        = string
  sensitive   = true
  default     = "UNSET_SECRET"
}

variable "openai_api_key" {
  description = "API key for OpenAI (Whisper, GPT)"
  type        = string
  sensitive   = true
  default     = "UNSET_SECRET"
}

variable "anthropic_api_key" {
  description = "API key for Anthropic (Claude — Chronos Copilot)"
  type        = string
  sensitive   = true
  default     = "UNSET_SECRET"
}

variable "gemini_api_key" {
  description = "API key for Google Gemini"
  type        = string
  sensitive   = true
  default     = "UNSET_SECRET"
}

variable "stripe_secret_key" {
  description = "Stripe secret key for payment processing"
  type        = string
  sensitive   = true
  default     = "UNSET_SECRET"
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
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

# ─────────────────────────────────────────────────────────────────────────────
# LLM Configuration
# ─────────────────────────────────────────────────────────────────────────────

variable "llm_provider" {
  description = "Default LLM provider for the Chronos Copilot"
  type        = string
  default     = "anthropic"

  validation {
    condition     = contains(["openai", "anthropic", "gemini", "ollama"], var.llm_provider)
    error_message = "LLM provider must be one of: openai, anthropic, gemini, ollama."
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Redis Cache
# ─────────────────────────────────────────────────────────────────────────────

variable "redis_sku_name" {
  description = "Azure Cache for Redis Enterprise SKU name"
  type        = string
  default     = "E10"

  validation {
    condition = contains([
      "E10", "E20", "E50", "E100",
    ], var.redis_sku_name)
    error_message = "Redis SKU must be a valid Enterprise tier SKU."
  }
}

variable "redis_capacity" {
  description = "Number of Redis Enterprise shards (capacity units)"
  type        = number
  default     = 1
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

variable "media_custom_domain" {
  description = "Custom domain for the media CDN endpoint"
  type        = string
  default     = "media.lazynext.ai"
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
