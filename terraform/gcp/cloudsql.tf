# ── Cloud SQL PostgreSQL Instance ──────────────────────────────────────────
resource "google_sql_database_instance" "postgres" {
  name             = "lazynext-postgres-${var.environment}"
  database_version = "POSTGRES_17"
  region           = var.region
  project          = var.project_id

  settings {
    tier              = var.db_tier
    edition           = "ENTERPRISE"
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_size         = var.environment == "production" ? 100 : 10
    disk_type         = "PD_SSD"
    disk_autoresize   = true
    disk_autoresize_limit = var.environment == "production" ? 500 : 100

    ip_configuration {
      ipv4_enabled    = true
      ssl_mode        = "ENCRYPTED_ONLY"
      # Cloud Run connects via VPC connector and Cloud SQL proxy sidecar.
      # No authorized_networks entry needed — the proxy handles auth internally.
    }

    database_flags {
      name  = "max_connections"
      value = var.environment == "production" ? "400" : "100"
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000" # Log queries > 1s
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = var.environment == "production" ? 30 : 7
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day  = 7 # Sunday
      hour = 4 # 4 AM
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }

  deletion_protection = true
}

# ── Database ────────────────────────────────────────────────────────────────
resource "google_sql_database" "lazynext_db" {
  name     = "lazynext"
  instance = google_sql_database_instance.postgres.name
}

# ── Database User ───────────────────────────────────────────────────────────
resource "google_sql_user" "lazynext_app" {
  name     = "lazynext_app"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# ── Read Replica (Production Only) ──────────────────────────────────────────
resource "google_sql_database_instance" "postgres_replica" {
  count = var.environment == "production" ? 1 : 0

  name                 = "lazynext-postgres-replica-${var.environment}"
  database_version     = "POSTGRES_17"
  region               = var.region
  master_instance_name = google_sql_database_instance.postgres.name

  replica_configuration {
    failover_target         = true
    password                = var.db_password
    username                = google_sql_user.lazynext_app.name
    connect_retry_interval  = 60
    master_heartbeat_period = 10000
  }

  settings {
    tier    = var.db_replica_tier
    edition = "ENTERPRISE"

    ip_configuration {
      ipv4_enabled    = true
      ssl_mode        = "ENCRYPTED_ONLY"
    }
  }

  deletion_protection = true
}
