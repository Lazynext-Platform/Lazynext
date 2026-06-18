terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    # Create the bucket first: gsutil mb gs://<project>-terraform-state
    bucket = "vertexaiopencode-terraform-state"
    prefix = "terraform/state"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
# Provider
# ─────────────────────────────────────────────────────────────────────────────
provider "google" {
  project = var.project_id
  region  = var.region
}

# ─────────────────────────────────────────────────────────────────────────────
# Enable required APIs
# ─────────────────────────────────────────────────────────────────────────────
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
    "vpcaccess.googleapis.com",
    "compute.googleapis.com",
  ])

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

# ─────────────────────────────────────────────────────────────────────────────
# VPC Network for Cloud SQL private connectivity
# ─────────────────────────────────────────────────────────────────────────────
resource "google_compute_network" "vpc" {
  name                    = "lazynext-vpc-${var.environment}"
  auto_create_subnetworks = false

  depends_on = [google_project_service.apis]
}

resource "google_compute_subnetwork" "subnet" {
  name          = "lazynext-subnet-${var.environment}"
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
}

# Serverless VPC Access connector for Cloud Run → Cloud SQL private path
resource "google_vpc_access_connector" "connector" {
  name          = "lazynext-vpc-connector-${var.environment}"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28"

  depends_on = [google_project_service.apis]
}

# ─────────────────────────────────────────────────────────────────────────────
# Artifact Registry — Docker image repository
# ─────────────────────────────────────────────────────────────────────────────
resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "lazynext"
  format        = "DOCKER"
  description   = "Docker images for the Lazynext platform"

  depends_on = [google_project_service.apis]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud SQL — PostgreSQL with private IP (no public exposure)
# ─────────────────────────────────────────────────────────────────────────────
resource "google_sql_database_instance" "postgres" {
  name             = "lazynext-db-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier              = var.db_tier
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_size         = 20
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.environment == "production"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }
  }

  deletion_protection = var.environment == "production"

  depends_on = [google_project_service.apis]
}

resource "google_sql_database" "lazynext" {
  name     = "lazynext"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app_user" {
  name     = "lazynext_app"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# ─────────────────────────────────────────────────────────────────────────────
# Secret Manager — API keys (referenced by Cloud Run, not plain env vars)
# ─────────────────────────────────────────────────────────────────────────────
resource "google_secret_manager_secret" "database_url" {
  secret_id = "DATABASE_URL"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://lazynext_app:${var.db_password}@${google_sql_database_instance.postgres.private_ip_address}:5432/lazynext"
}

resource "google_secret_manager_secret" "replicate_api_token" {
  secret_id = "REPLICATE_API_TOKEN"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "replicate_api_token" {
  secret      = google_secret_manager_secret.replicate_api_token.id
  secret_data = var.replicate_api_token != "" ? var.replicate_api_token : "mock-token"
}

resource "google_secret_manager_secret" "elevenlabs_api_key" {
  secret_id = "ELEVENLABS_API_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "elevenlabs_api_key" {
  secret      = google_secret_manager_secret.elevenlabs_api_key.id
  secret_data = var.elevenlabs_api_key != "" ? var.elevenlabs_api_key : "mock-key"
}

resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "OPENAI_API_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "openai_api_key" {
  secret      = google_secret_manager_secret.openai_api_key.id
  secret_data = var.openai_api_key
}

resource "google_secret_manager_secret" "anthropic_api_key" {
  secret_id = "ANTHROPIC_API_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "anthropic_api_key" {
  secret      = google_secret_manager_secret.anthropic_api_key.id
  secret_data = var.anthropic_api_key
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Storage — Media bucket for uploads and rendered videos
# ─────────────────────────────────────────────────────────────────────────────
resource "google_storage_bucket" "media" {
  name          = "${var.project_id}-lazynext-media-${var.environment}"
  location      = var.region
  force_destroy = var.environment != "production"

  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]
    method          = ["GET", "PUT", "POST"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  depends_on = [google_project_service.apis]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Run — Web App (Next.js frontend + API)
# ─────────────────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "web" {
  name     = "lazynext-web-${var.environment}"
  location = var.region

  template {
    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/lazynext/lazynext-web:latest"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "NEXT_PUBLIC_APP_URL"
        value = var.app_domain
      }

      env {
        name  = "MEDIA_BUCKET"
        value = google_storage_bucket.media.name
      }
    }

    scaling {
      min_instance_count = var.environment == "production" ? 1 : 0
      max_instance_count = 10
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.docker,
    google_vpc_access_connector.connector,
  ]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Run — Generative Studio (Python FastAPI)
# ─────────────────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "generative_studio" {
  name     = "lazynext-gen-studio-${var.environment}"
  location = var.region

  template {
    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/lazynext/lazynext-generative-studio:latest"

      ports {
        container_port = 8001
      }

      resources {
        limits = {
          cpu    = "4"
          memory = "4Gi"
        }
      }

      env {
        name = "REPLICATE_API_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.replicate_api_token.secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "ELEVENLABS_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.elevenlabs_api_key.secret_id
            version = "latest"
          }
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.docker,
  ]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Run — Render Service (Node.js + FFMPEG)
# ─────────────────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "render_service" {
  name     = "lazynext-render-${var.environment}"
  location = var.region

  template {
    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/lazynext/lazynext-render-service:latest"

      ports {
        container_port = 8003
      }

      resources {
        limits = {
          cpu    = "4"
          memory = "4Gi"
        }
      }

      env {
        name  = "MEDIA_BUCKET"
        value = google_storage_bucket.media.name
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 10
    }

    timeout = "600s"
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.docker,
  ]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Run — AI Agents (Node.js Chronos Copilot)
# ─────────────────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "ai_agents" {
  name     = "lazynext-ai-agents-${var.environment}"
  location = var.region

  template {
    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/lazynext/lazynext-ai-agents:latest"

      ports {
        container_port = 8002
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.docker,
  ]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Run — Pre-Processing (Python NeRFs + Rotoscoping)
# ─────────────────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "pre_processing" {
  name     = "lazynext-pre-processing-${var.environment}"
  location = var.region

  template {
    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/lazynext/lazynext-pre-processing:latest"

      ports {
        container_port = 8000
      }

      resources {
        limits = {
          cpu    = "4"
          memory = "8Gi"
        }
      }

      env {
        name = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.openai_api_key.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "MEDIA_BUCKET"
        value = google_storage_bucket.media.name
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    timeout = "900s"
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.docker,
  ]
}

# ─────────────────────────────────────────────────────────────────────────────
# IAM — Allow unauthenticated access only to the web frontend (public)
# ─────────────────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service_iam_member" "web_public" {
  name     = google_cloud_run_v2_service.web.name
  location = google_cloud_run_v2_service.web.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Backend services are internal-only — no allUsers IAM binding.
# Cloud Run services within the same project can invoke each other by default.

# ─────────────────────────────────────────────────────────────────────────────
# Outputs
# ─────────────────────────────────────────────────────────────────────────────
output "web_url" {
  description = "The public URL of the Lazynext web app"
  value       = google_cloud_run_v2_service.web.uri
}

output "generative_studio_url" {
  description = "Internal URL of the Generative Studio service"
  value       = google_cloud_run_v2_service.generative_studio.uri
}

output "render_service_url" {
  description = "Internal URL of the Render Service"
  value       = google_cloud_run_v2_service.render_service.uri
}

output "ai_agents_url" {
  description = "Internal URL of the AI Agents service"
  value       = google_cloud_run_v2_service.ai_agents.uri
}

output "pre_processing_url" {
  description = "Internal URL of the Pre-Processing service"
  value       = google_cloud_run_v2_service.pre_processing.uri
}

output "database_private_ip" {
  description = "Private IP of the Cloud SQL PostgreSQL instance"
  value       = google_sql_database_instance.postgres.private_ip_address
}

output "media_bucket" {
  description = "Name of the media storage bucket"
  value       = google_storage_bucket.media.name
}
