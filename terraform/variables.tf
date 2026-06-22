# ─────────────────────────────────────────────────────────────────────────────
# Required Variables
# ─────────────────────────────────────────────────────────────────────────────

variable "project_id" {
  description = "The GCP project ID to deploy into"
  type        = string
  default     = "vertexaiopencode"
}

variable "region" {
  description = "The GCP region for all resources"
  type        = string
  default     = "us-central1"
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

# ─────────────────────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────────────────────

variable "db_password" {
  description = "Password for the PostgreSQL application user"
  type        = string
  sensitive   = true
  default     = "UNSET_SECRET"
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}

variable "db_replica_tier" {
  description = "Cloud SQL read replica machine tier"
  type        = string
  default     = "db-f1-micro"
}

# ─────────────────────────────────────────────────────────────────────────────
# Application
# ─────────────────────────────────────────────────────────────────────────────

variable "app_domain" {
  description = "The public domain of the Lazynext web app"
  type        = string
  default     = "https://lazynext.com"
}

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

variable "stripe_secret_key" {
  description = "Stripe secret key for payment processing"
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


