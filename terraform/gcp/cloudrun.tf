# ── Google Cloud Storage — Media Bucket ───────────────────────────────────
resource "google_storage_bucket" "media" {
  name     = "${var.project_id}-lazynext-media-${var.environment}"
  location = var.region

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = var.environment == "production"
  }

  lifecycle_rule {
    condition {
      age = var.environment == "production" ? 90 : 30
    }
    action {
      type = "Delete"
    }
  }

  cors {
    origin          = [var.app_domain]
    method          = ["GET", "POST", "PUT", "DELETE", "HEAD"]
    response_header = ["Content-Type", "Content-Length", "Content-Range"]
    max_age_seconds = 3600
  }
}

# ── Service Account for Cloud Run ──────────────────────────────────────────
resource "google_service_account" "cloud_run_sa" {
  account_id   = "lazynext-cloud-run-${var.environment}"
  display_name = "Lazynext Cloud Run Service Account (${var.environment})"
}

# Allow Cloud Run to access Cloud SQL
resource "google_project_iam_member" "cloud_run_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Allow Cloud Run to access GCS
resource "google_project_iam_member" "cloud_run_storage" {
  project = var.project_id
  role    = "roles/storage.objectUser"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# Allow Cloud Run to access Secret Manager
resource "google_project_iam_member" "cloud_run_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}

# ── Cloud Run V2 Services ──────────────────────────────────────────────────

# Web App (Next.js)
resource "google_cloud_run_v2_service" "web" {
  name     = "lazynext-web-${var.environment}"
  location = var.region
  project  = var.project_id
  deletion_protection = var.environment == "production"

  template {
    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/lazynext/lazynext-web:latest"
      ports {
        container_port = 3000
      }
      resources {
        limits = {
          cpu    = var.environment == "production" ? "2" : "1"
          memory = var.environment == "production" ? "2Gi" : "1Gi"
        }
        cpu_idle          = var.environment != "production"
        startup_cpu_boost = true
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "DATABASE_URL"
        value = "postgresql://lazynext_app:${var.db_password}@/lazynext?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
      }
      env {
        name  = "BETTER_AUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.better_auth_secret.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "STORAGE_PROVIDER"
        value = "gcs"
      }
      env {
        name  = "MEDIA_BUCKET"
        value = google_storage_bucket.media.name
      }
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.postgres.connection_name]
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.cloud_run.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    scaling {
      min_instance_count = var.environment == "production" ? 1 : 0
      max_instance_count = var.environment == "production" ? 10 : 3
    }

    service_account = google_service_account.cloud_run_sa.email
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  ingress = "INGRESS_TRAFFIC_ALL"

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# AI Agents / Sync Service
resource "google_cloud_run_v2_service" "ai_agents" {
  name     = "lazynext-ai-agents-${var.environment}"
  location = var.region
  project  = var.project_id
  deletion_protection = false

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
        cpu_idle          = var.environment != "production"
        startup_cpu_boost = true
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "LLM_PROVIDER"
        value = var.llm_provider
      }
      env {
        name  = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.openai_api_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "ANTHROPIC_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.anthropic_api_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "PRE_PROCESSING_URL"
        value = "${google_cloud_run_v2_service.pre_processing.uri}/"
      }
      env {
        name  = "GENERATIVE_STUDIO_URL"
        value = "${google_cloud_run_v2_service.generative_studio.uri}/"
      }
      env {
        name  = "RENDER_SERVICE_URL"
        value = "${google_cloud_run_v2_service.render_service.uri}/"
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.cloud_run.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    scaling {
      min_instance_count = var.environment == "production" ? 1 : 0
      max_instance_count = var.environment == "production" ? 8 : 2
    }

    service_account = google_service_account.cloud_run_sa.email
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# Render Service
resource "google_cloud_run_v2_service" "render_service" {
  name     = "lazynext-render-${var.environment}"
  location = var.region
  project  = var.project_id
  deletion_protection = false

  template {
    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/lazynext/lazynext-render-service:latest"
      ports {
        container_port = 8003
      }
      resources {
        limits = {
          cpu    = "4"
          memory = "8Gi"
        }
        cpu_idle          = var.environment != "production"
        startup_cpu_boost = true
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "MEDIA_BUCKET"
        value = google_storage_bucket.media.name
      }
      env {
        name  = "STORAGE_PROVIDER"
        value = "gcs"
      }
      startup_probe {
        initial_delay_seconds = 20
        timeout_seconds      = 10
        period_seconds       = 15
        failure_threshold    = 5
        tcp_socket {
          port = 8003
        }
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.cloud_run.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    timeout = "900s"

    scaling {
      min_instance_count = var.environment == "production" ? 1 : 0
      max_instance_count = var.environment == "production" ? 15 : 3
    }

    service_account = google_service_account.cloud_run_sa.email
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# Pre-Processing Service
resource "google_cloud_run_v2_service" "pre_processing" {
  name     = "lazynext-pre-processing-${var.environment}"
  location = var.region
  project  = var.project_id
  deletion_protection = false

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
        cpu_idle          = var.environment != "production"
        startup_cpu_boost = true
      }
      env {
        name  = "PYTHONUNBUFFERED"
        value = "1"
      }
      env {
        name  = "MEDIA_BUCKET"
        value = google_storage_bucket.media.name
      }
      env {
        name  = "OPENAI_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.openai_api_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "REPLICATE_API_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.replicate_api_token.secret_id
            version = "latest"
          }
        }
      }
      startup_probe {
        initial_delay_seconds = 60
        timeout_seconds      = 10
        period_seconds       = 30
        failure_threshold    = 5
        http_get {
          path = "/"
          port = 8000
        }
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.cloud_run.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    timeout = "900s"

    scaling {
      min_instance_count = 0
      max_instance_count = var.environment == "production" ? 4 : 1
    }

    service_account = google_service_account.cloud_run_sa.email
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# Generative Studio Service
resource "google_cloud_run_v2_service" "generative_studio" {
  name     = "lazynext-gen-studio-${var.environment}"
  location = var.region
  project  = var.project_id
  deletion_protection = false

  template {
    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/lazynext/lazynext-generative-studio:latest"
      ports {
        container_port = 8001
      }
      resources {
        limits = {
          cpu    = "4"
          memory = "8Gi"
        }
        cpu_idle          = var.environment != "production"
        startup_cpu_boost = true
      }
      env {
        name  = "PYTHONUNBUFFERED"
        value = "1"
      }
      env {
        name  = "REPLICATE_API_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.replicate_api_token.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "ELEVENLABS_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.elevenlabs_api_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "HF_HOME"
        value = "/tmp/huggingface"
      }
      env {
        name  = "TRANSFORMERS_CACHE"
        value = "/tmp/huggingface"
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.cloud_run.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    timeout = "900s"

    scaling {
      min_instance_count = 0
      max_instance_count = var.environment == "production" ? 4 : 1
    }

    service_account = google_service_account.cloud_run_sa.email
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

# ── VPC Access Connector (for Cloud Run to reach VPC resources) ───────────
resource "google_vpc_access_connector" "cloud_run" {
  name          = "lazynext-vpc-con-${var.environment}"
  region        = var.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.8.0.0/28"
  machine_type  = "e2-micro"
  min_instances = 2
  max_instances = var.environment == "production" ? 10 : 3
}
