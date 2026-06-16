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
}

variable "db_tier" {
  description = "Cloud SQL machine tier (e.g. db-f1-micro for dev, db-custom-2-4096 for prod)"
  type        = string
  default     = "db-f1-micro"
}

# ─────────────────────────────────────────────────────────────────────────────
# Application
# ─────────────────────────────────────────────────────────────────────────────

variable "app_domain" {
  description = "The public domain of the Lazynext web app (e.g. https://app.lazynext.ai)"
  type        = string
  default     = "https://lazynext.ai"
}

# ─────────────────────────────────────────────────────────────────────────────
# API Keys (optional — services fall back to mock mode without these)
# ─────────────────────────────────────────────────────────────────────────────

variable "replicate_api_token" {
  description = "API token for Replicate (AI video generation). Leave empty to use mock mode."
  type        = string
  sensitive   = true
  default     = ""
}

variable "elevenlabs_api_key" {
  description = "API key for ElevenLabs (AI dubbing). Leave empty to use mock mode."
  type        = string
  sensitive   = true
  default     = ""
}
