terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Store terraform state locally (override with -backend-config for GCS in CI)
  # Prerequisite for GCS: gsutil mb gs://<project>-terraform-state
  # backend "gcs" {
  #   bucket = "vertexaiopencode-terraform-state"
  #   prefix = "terraform/state"
  # }
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
  ])

  project = var.project_id
  service = each.value

  disable_on_destroy = false
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
# Cloud SQL — PostgreSQL for user data, projects, and AI credits
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
      ipv4_enabled = true
      # WARNING: 0.0.0.0/0 allows connections from any IP. For production,
      # use Cloud SQL Auth Proxy sidecar in Cloud Run or configure private IP
      # with Serverless VPC Access connector:
      #   https://cloud.google.com/sql/docs/postgres/connect-run
      authorized_networks {
        name  = "allow-all"
        value = "0.0.0.0/0"
      }
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
      age = 90 # Delete temporary render outputs after 90 days
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
        name  = "DATABASE_URL"
        value = "postgresql://lazynext_app:${var.db_password}@${google_sql_database_instance.postgres.public_ip_address}:5432/lazynext"
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
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.docker,
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
        name  = "REPLICATE_API_TOKEN"
        value = var.replicate_api_token
      }

      env {
        name  = "ELEVENLABS_API_KEY"
        value = var.elevenlabs_api_key
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

    # Render jobs can take several minutes
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
# IAM — Allow unauthenticated access to the web frontend (public)
# ─────────────────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service_iam_member" "web_public" {
  name     = google_cloud_run_v2_service.web.name
  location = google_cloud_run_v2_service.web.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

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

output "database_ip" {
  description = "Public IP of the Cloud SQL PostgreSQL instance"
  value       = google_sql_database_instance.postgres.public_ip_address
}

output "media_bucket" {
  description = "Name of the media storage bucket"
  value       = google_storage_bucket.media.name
}
