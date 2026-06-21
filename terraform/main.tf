

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
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "cloudkms.googleapis.com",
    "servicenetworking.googleapis.com",
    "cloudscheduler.googleapis.com",
  ])

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

# ─────────────────────────────────────────────────────────────────────────────
# Service Account for Cloud Run
# ─────────────────────────────────────────────────────────────────────────────
resource "google_service_account" "cloud_run" {
  account_id   = "lazynext-cloud-run-${var.environment}"
  display_name = "Lazynext Cloud Run Service Account (${var.environment})"
  project      = var.project_id

  depends_on = [google_project_service.apis]
}

resource "google_project_iam_member" "cloud_run_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_iam_member" "cloud_run_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_iam_member" "cloud_run_storage_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_project_iam_member" "cloud_run_artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
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

# Service Networking for Cloud SQL Private IP
resource "google_compute_global_address" "private_ip_address" {
  name          = "lazynext-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
  depends_on              = [google_project_service.apis]
}

# Serverless VPC Access connector for Cloud Run → Cloud SQL private path
resource "google_vpc_access_connector" "connector" {
  name          = "lazynext-vpc-con-${var.environment}"
  region        = var.region
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28"
  machine_type  = "e2-micro"
  min_instances = 2
  max_instances = 10

  lifecycle {
    ignore_changes = [max_throughput]
  }

  depends_on = [google_project_service.apis]
}

# ─────────────────────────────────────────────────────────────────────────────
# Firewall — allow SSH from IAP for debugging
# ─────────────────────────────────────────────────────────────────────────────
resource "google_compute_firewall" "iap_ssh" {
  name    = "lazynext-allow-iap-ssh"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["allow-iap"]
}

# ─────────────────────────────────────────────────────────────────────────────
# Artifact Registry — Docker image repository
# ─────────────────────────────────────────────────────────────────────────────
resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = "lazynext"
  format        = "DOCKER"
  description   = "Docker images for the Lazynext platform"

  cleanup_policy_dry_run = false

  depends_on = [google_project_service.apis]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud SQL — PostgreSQL with private IP
# ─────────────────────────────────────────────────────────────────────────────
resource "google_sql_database_instance" "postgres" {
  name             = "lazynext-db-${var.environment}"
  database_version = "POSTGRES_17"
  region           = var.region

  settings {
    tier              = var.db_tier
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_size         = var.environment == "production" ? 100 : 20
    disk_autoresize   = true
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = var.environment == "production"
      start_time                     = "03:00"
      transaction_log_retention_days = var.environment == "production" ? 7 : 1
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      require_ssl     = var.environment == "production"
    }

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }
  }

  deletion_protection = var.environment == "production"

  depends_on = [
    google_project_service.apis,
    google_service_networking_connection.private_vpc_connection
  ]
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
# Secret Manager — API keys and secrets
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
  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "DB_PASSWORD"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "better_auth_secret" {
  secret_id = "BETTER_AUTH_SECRET"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "better_auth_secret" {
  secret      = google_secret_manager_secret.better_auth_secret.id
  secret_data = var.better_auth_secret
  lifecycle {
    ignore_changes = [secret_data]
  }
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
  lifecycle {
    ignore_changes = [secret_data]
  }
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
  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "OPENAI_API_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "openai_api_key" {
  secret      = google_secret_manager_secret.openai_api_key.id
  secret_data = var.openai_api_key != "" ? var.openai_api_key : "mock-key"
  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "anthropic_api_key" {
  secret_id = "ANTHROPIC_API_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "anthropic_api_key" {
  secret      = google_secret_manager_secret.anthropic_api_key.id
  secret_data = var.anthropic_api_key != "" ? var.anthropic_api_key : "mock-key"
  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "stripe_secret_key" {
  secret_id = "STRIPE_SECRET_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "stripe_secret_key" {
  secret      = google_secret_manager_secret.stripe_secret_key.id
  secret_data = var.stripe_secret_key != "" ? var.stripe_secret_key : "mock-key"
  lifecycle {
    ignore_changes = [secret_data]
  }
}

resource "google_secret_manager_secret" "resend_api_key" {
  secret_id = "RESEND_API_KEY"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "resend_api_key" {
  secret      = google_secret_manager_secret.resend_api_key.id
  secret_data = var.resend_api_key != "" ? var.resend_api_key : "mock-key"
  lifecycle {
    ignore_changes = [secret_data]
  }
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
    method          = ["GET", "PUT", "POST", "HEAD"]
    response_header = ["Content-Type", "Content-Length", "Content-Range"]
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

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.apis]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Run — Web App
# ─────────────────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "web" {
  name     = "lazynext-web-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run.email

    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/lazynext/lazynext-web:latest"

      ports {
        container_port = 3000
      }

      resources {
        limits = {
          cpu    = "2"
          memory = "2Gi"
        }
      }

      startup_probe {
        http_get {
          path = "/api/health"
        }
        initial_delay_seconds = 0
        period_seconds        = 3
        timeout_seconds       = 3
        failure_threshold     = 10
      }

      liveness_probe {
        http_get {
          path = "/api/health"
        }
        period_seconds = 15
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
        name = "BETTER_AUTH_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.better_auth_secret.secret_id
            version = "latest"
          }
        }
      }

      env {
        name  = "NEXT_PUBLIC_SITE_URL"
        value = var.app_domain
      }

      env {
        name  = "STORAGE_PROVIDER"
        value = "gcs"
      }

      env {
        name  = "MEDIA_BUCKET"
        value = google_storage_bucket.media.name
      }

      env {
        name  = "NEXT_PUBLIC_PREPROCESSING_URL"
        value = google_cloud_run_v2_service.pre_processing.uri
      }

      env {
        name  = "NEXT_PUBLIC_GENERATIVE_STUDIO_URL"
        value = google_cloud_run_v2_service.generative_studio.uri
      }

      env {
        name  = "NEXT_PUBLIC_AI_AGENTS_URL"
        value = google_cloud_run_v2_service.ai_agents.uri
      }

      env {
        name  = "NEXT_PUBLIC_RENDER_SERVICE_URL"
        value = google_cloud_run_v2_service.render_service.uri
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

    timeout = "300s"
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.docker,
    google_vpc_access_connector.connector,
  ]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Run — Generative Studio
# ─────────────────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "generative_studio" {
  name     = "lazynext-gen-studio-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run.email

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
      }

      startup_probe {
        http_get {
          path = "/"
        }
        initial_delay_seconds = 10
        period_seconds        = 10
        timeout_seconds       = 10
        failure_threshold     = 15
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
# Cloud Run — Render Service
# ─────────────────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "render_service" {
  name     = "lazynext-render-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run.email

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
      }

      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        timeout_seconds       = 5
        failure_threshold     = 12
      }

      env {
        name  = "STORAGE_PROVIDER"
        value = "gcs"
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

    timeout = "900s"
  }

  depends_on = [
    google_project_service.apis,
    google_artifact_registry_repository.docker,
  ]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Run — AI Agents
# ─────────────────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "ai_agents" {
  name     = "lazynext-ai-agents-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run.email

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

      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 5
        timeout_seconds       = 5
        failure_threshold     = 6
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "PRE_PROCESSING_URL"
        value = google_cloud_run_v2_service.pre_processing.uri
      }
      env {
        name  = "GENERATIVE_STUDIO_URL"
        value = google_cloud_run_v2_service.generative_studio.uri
      }
      env {
        name  = "RENDER_SERVICE_URL"
        value = google_cloud_run_v2_service.render_service.uri
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
        name = "ANTHROPIC_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.anthropic_api_key.secret_id
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
# Cloud Run — Pre-Processing
# ─────────────────────────────────────────────────────────────────────────────
resource "google_cloud_run_v2_service" "pre_processing" {
  name     = "lazynext-pre-processing-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run.email

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

      startup_probe {
        http_get {
          path = "/"
        }
        initial_delay_seconds = 10
        period_seconds        = 10
        timeout_seconds       = 10
        failure_threshold     = 12
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

resource "google_cloud_run_v2_service_iam_member" "gen_studio_public" {
  name     = google_cloud_run_v2_service.generative_studio.name
  location = google_cloud_run_v2_service.generative_studio.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "render_service_public" {
  name     = google_cloud_run_v2_service.render_service.name
  location = google_cloud_run_v2_service.render_service.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "ai_agents_public" {
  name     = google_cloud_run_v2_service.ai_agents.name
  location = google_cloud_run_v2_service.ai_agents.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "pre_processing_public" {
  name     = google_cloud_run_v2_service.pre_processing.name
  location = google_cloud_run_v2_service.pre_processing.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Monitoring — Uptime Check for the web app
# ─────────────────────────────────────────────────────────────────────────────
resource "google_monitoring_uptime_check_config" "web" {
  display_name = "Lazynext Web App (${var.environment})"
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = "/api/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = replace(var.app_domain, "https://", "")
    }
  }

  depends_on = [google_project_service.apis]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Monitoring — Alert Policy for high error rate
# ─────────────────────────────────────────────────────────────────────────────
resource "google_monitoring_alert_policy" "web_error_rate" {
  display_name = "Lazynext Web — High Error Rate (${var.environment})"
  combiner     = "OR"

  conditions {
    display_name = "5xx error rate > 5%"
    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"${google_cloud_run_v2_service.web.name}\" AND metric.type = \"run.googleapis.com/request_count\" AND metric.labels.response_code_class = \"5xx\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.05

      aggregations {
        alignment_period   = "60s"
        cross_series_reducer = "REDUCE_SUM"
        per_series_aligner = "ALIGN_RATE"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = []

  depends_on = [google_project_service.apis]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud SQL — Read Replica for analytics and offloaded queries
# ─────────────────────────────────────────────────────────────────────────────
resource "google_sql_database_instance" "postgres_replica" {
  count = var.environment == "production" ? 1 : 0

  name                 = "lazynext-db-${var.environment}-replica"
  database_version     = "POSTGRES_17"
  region               = var.region
  master_instance_name = google_sql_database_instance.postgres.name

  replica_configuration {
    failover_target = false
  }

  settings {
    tier              = var.db_replica_tier
    disk_type         = "PD_SSD"
    disk_size         = 100
    disk_autoresize   = true
    availability_type = "ZONAL"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    database_flags {
      name  = "max_connections"
      value = "50"
    }
  }

  deletion_protection = true

  depends_on = [google_sql_database_instance.postgres]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud SQL — Data encryption with CMEK (Customer-Managed Encryption Key)
# ─────────────────────────────────────────────────────────────────────────────


resource "google_kms_key_ring" "db_keyring" {
  name     = "lazynext-db-keyring-${var.environment}"
  location = var.region
  depends_on = [google_project_service.apis]
}

resource "google_kms_crypto_key" "db_cmek" {
  name            = "lazynext-db-cmek-${var.environment}"
  key_ring        = google_kms_key_ring.db_keyring.id
  rotation_period = "7776000s" # 90 days
  purpose         = "ENCRYPT_DECRYPT"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "SOFTWARE"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Grant Cloud SQL permission to use the CMEK key
resource "google_kms_crypto_key_iam_member" "cloudsql_cmek" {
  crypto_key_id = google_kms_crypto_key.db_cmek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_service_account.cloud_run.email}"
}

# ─────────────────────────────────────────────────────────────────────────────
# PgBouncer — Connection pooling sidecar for Cloud SQL
# ─────────────────────────────────────────────────────────────────────────────
# Enables connection pooling to prevent exhausting Cloud SQL connections.
# Cloud Run services connect to PgBouncer (port 6432) instead of Cloud SQL directly.
resource "google_cloud_run_v2_service" "pgbouncer" {
  name     = "lazynext-pgbouncer-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = google_service_account.cloud_run.email

    containers {
      image = "edoburu/pgbouncer:latest"
      name  = "pgbouncer"

      ports {
        container_port = 5432
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      env {
        name  = "DB_HOST"
        value = google_sql_database_instance.postgres.private_ip_address
      }
      env {
        name  = "DB_NAME"
        value = "lazynext"
      }
      env {
        name  = "DB_USER"
        value = "lazynext_app"
      }
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "POOL_MODE"
        value = "transaction"
      }
      env {
        name  = "MAX_CLIENT_CONN"
        value = "500"
      }
      env {
        name  = "DEFAULT_POOL_SIZE"
        value = "25"
      }
      env {
        name  = "RESERVE_POOL_SIZE"
        value = "10"
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 3
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  depends_on = [
    google_project_service.apis,
    google_vpc_access_connector.connector,
  ]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Storage — Backup bucket
# ─────────────────────────────────────────────────────────────────────────────
resource "google_storage_bucket" "backups" {
  name          = "${var.project_id}-lazynext-backups-${var.environment}"
  location      = var.region
  force_destroy = var.environment != "production"

  uniform_bucket_level_access = true

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.apis]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Scheduler — Automated database backups
# ─────────────────────────────────────────────────────────────────────────────
resource "google_cloud_scheduler_job" "db_backup" {
  name        = "lazynext-db-backup-${var.environment}"
  description = "Triggers Cloud Build to run pg_dump to GCS every 6 hours"
  schedule    = "0 */6 * * *"
  time_zone   = "America/Chicago"

  http_target {
    http_method = "POST"
    uri         = "https://cloudbuild.googleapis.com/v1/projects/${var.project_id}/builds"

    oauth_token {
      service_account_email = google_service_account.cloud_run.email
    }

    body = base64encode(jsonencode({
      steps = [
        {
          name       = "postgres:17-alpine"
          entrypoint = "sh"
          args = [
            "-c",
            "pg_dump -h ${google_sql_database_instance.postgres.private_ip_address} -U lazynext_app -d lazynext --no-owner --no-acl | gzip | gcloud storage cp - gs://${google_storage_bucket.backups.name}/lazynext_$(date +%Y%m%d_%H%M%S).sql.gz"
          ]
          env = ["PGPASSWORD=${var.db_password}"]
        }
      ]
      timeout = "1800s"
    }))
  }

  depends_on = [google_project_service.apis]
}

# ─────────────────────────────────────────────────────────────────────────────
# Cloud Armor — WAF Security Policy
# ─────────────────────────────────────────────────────────────────────────────
resource "google_compute_security_policy" "waf" {
  name        = "lazynext-waf-${var.environment}"
  description = "WAF policy for Lazynext web application"

  # Rate limiting: 1000 requests per 60s per IP
  rule {
    action   = "throttle"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      rate_limit_threshold {
        count        = 1000
        interval_sec = 60
      }
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
    }
  }

  # Block SQL injection patterns
  rule {
    action   = "deny(403)"
    priority = "2000"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-v33-stable')"
      }
    }
    description = "SQL injection protection"
  }

  # Block XSS patterns
  rule {
    action   = "deny(403)"
    priority = "3000"
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v33-stable')"
      }
    }
    description = "XSS protection"
  }

  # Allow health check probes
  rule {
    action   = "allow"
    priority = "2147483646"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["130.211.0.0/22", "35.191.0.0/16", "209.85.152.0/22", "209.85.204.0/22"]
      }
    }
    description = "Allow Google Cloud health check probes"
  }

  # Default rule
  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default rule"
  }

  depends_on = [google_project_service.apis]
}

# ─────────────────────────────────────────────────────────────────────────────
# External Load Balancer + CDN
# ─────────────────────────────────────────────────────────────────────────────
resource "google_compute_global_address" "web_lb" {
  name = "lazynext-lb-ip-${var.environment}"
}

resource "google_compute_managed_ssl_certificate" "web_cert" {
  name = "lazynext-cert-${var.environment}-v2"

  managed {
    domains = [
      replace(var.app_domain, "https://", ""),
      "www.${replace(var.app_domain, "https://", "")}",
    ]
  }

  depends_on = [google_project_service.apis]
}

resource "google_compute_backend_service" "web_backend" {
  name        = "lazynext-backend-${var.environment}"
  protocol    = "HTTPS"

  backend {
    group = google_compute_region_network_endpoint_group.web_neg.id
  }

  # Enable Cloud CDN
  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    default_ttl                  = 3600
    client_ttl                   = 86400
    max_ttl                      = 604800
    negative_caching             = true
    serve_while_stale            = 86400
    signed_url_cache_max_age_sec = 0
  }

  # Enable IAP-like edge security
  security_policy = google_compute_security_policy.waf.name

  log_config {
    enable = true
  }

  depends_on = [google_project_service.apis]
}

resource "google_compute_region_network_endpoint_group" "web_neg" {
  name                  = "lazynext-neg-${var.environment}"
  region                = var.region
  network_endpoint_type = "SERVERLESS"
  cloud_run {
    service = google_cloud_run_v2_service.web.name
  }
}

resource "google_compute_url_map" "web_url_map" {
  name            = "lazynext-url-map-${var.environment}"
  default_service = google_compute_backend_service.web_backend.id
}

resource "google_compute_target_https_proxy" "web_proxy" {
  name             = "lazynext-https-proxy-${var.environment}"
  url_map          = google_compute_url_map.web_url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.web_cert.id]
}

resource "google_compute_global_forwarding_rule" "web_forwarding_rule" {
  name       = "lazynext-forwarding-rule-${var.environment}"
  target     = google_compute_target_https_proxy.web_proxy.id
  port_range = "443"
  ip_address = google_compute_global_address.web_lb.address
}

# HTTP-to-HTTPS redirect
resource "google_compute_url_map" "http_redirect" {
  name = "lazynext-http-redirect-${var.environment}"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "http_proxy" {
  name    = "lazynext-http-proxy-${var.environment}"
  url_map = google_compute_url_map.http_redirect.id
}

resource "google_compute_global_forwarding_rule" "http_forwarding_rule" {
  name       = "lazynext-http-redirect-rule-${var.environment}"
  target     = google_compute_target_http_proxy.http_proxy.id
  port_range = "80"
  ip_address = google_compute_global_address.web_lb.address
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

output "database_private_ip" {
  description = "Private IP of the Cloud SQL PostgreSQL instance"
  value       = google_sql_database_instance.postgres.private_ip_address
}

output "media_bucket" {
  description = "Name of the media storage bucket"
  value       = google_storage_bucket.media.name
}

output "pgbouncer_url" {
  description = "Internal URL of the PgBouncer connection pooler"
  value       = google_cloud_run_v2_service.pgbouncer.uri
}

output "load_balancer_ip" {
  description = "Global static IP of the load balancer"
  value       = google_compute_global_address.web_lb.address
}

output "backup_bucket" {
  description = "Name of the backup storage bucket"
  value       = google_storage_bucket.backups.name
}

# ─────────────────────────────────────────────────────────────────────────────
# Workload Identity Federation (GitHub Actions CI/CD)
# ─────────────────────────────────────────────────────────────────────────────
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-deploy"
  display_name = "Service Account for GitHub Actions CI/CD"
  project      = var.project_id
}

resource "google_project_iam_member" "github_actions_owner" {
  project = var.project_id
  role    = "roles/owner"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

resource "google_iam_workload_identity_pool" "github_actions_pool" {
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Identity pool for GitHub Actions CI/CD deployments"
}

resource "google_iam_workload_identity_pool_provider" "github_actions_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_actions_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions-provider"
  display_name                       = "GitHub Actions Provider"
  description                        = "OIDC identity pool provider for automated deployments"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  attribute_condition = "attribute.repository == \"Lazynext-Platform/Lazynext\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_actions_impersonation" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_actions_pool.name}/attribute.repository/Lazynext-Platform/Lazynext"
}

output "github_actions_service_account_email" {
  description = "The service account email for GitHub Actions to impersonate"
  value       = google_service_account.github_actions.email
}

output "workload_identity_provider_name" {
  description = "The Workload Identity Provider ID for GitHub Actions"
  value       = google_iam_workload_identity_pool_provider.github_actions_provider.name
}
