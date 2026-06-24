variable "location" {
  description = "Azure region for the deployment"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, prod)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "kubernetes_version" {
  description = "Kubernetes version for AKS"
  type        = string
  default     = "1.29.2"
}

variable "node_count" {
  description = "Number of nodes in default node pool"
  type        = number
  default     = 2
}
