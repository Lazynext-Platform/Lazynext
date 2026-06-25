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
  default     = "1.30"
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
