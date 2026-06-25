# ── Secret Manager — Application Secrets ───────────────────────────────────

# Note: Secret versions are created externally (CI/CD or manual) and referenced
# here as existing secrets. Terraform manages only the secret metadata.
# To create the actual secret data: echo -n "secret-value" | gcloud secrets versions add SECRET_ID --data-file=-

resource "google_secret_manager_secret" "better_auth_secret" {
  secret_id = "better-auth-secret-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret" "openai_api_key" {
  secret_id = "openai-api-key-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret" "anthropic_api_key" {
  secret_id = "anthropic-api-key-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret" "gemini_api_key" {
  secret_id = "gemini-api-key-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret" "replicate_api_token" {
  secret_id = "replicate-api-token-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret" "elevenlabs_api_key" {
  secret_id = "elevenlabs-api-key-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret" "stripe_secret_key" {
  secret_id = "stripe-secret-key-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret" "stripe_webhook_secret" {
  secret_id = "stripe-webhook-secret-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "google_secret_manager_secret" "resend_api_key" {
  secret_id = "resend-api-key-${var.environment}"
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Grant Secret Manager access to Cloud Run service account
resource "google_secret_manager_secret_iam_member" "cloud_run_access" {
  for_each = toset([
    google_secret_manager_secret.better_auth_secret.secret_id,
    google_secret_manager_secret.openai_api_key.secret_id,
    google_secret_manager_secret.anthropic_api_key.secret_id,
    google_secret_manager_secret.gemini_api_key.secret_id,
    google_secret_manager_secret.replicate_api_token.secret_id,
    google_secret_manager_secret.elevenlabs_api_key.secret_id,
    google_secret_manager_secret.stripe_secret_key.secret_id,
    google_secret_manager_secret.stripe_webhook_secret.secret_id,
    google_secret_manager_secret.resend_api_key.secret_id,
  ])

  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.cloud_run_sa.email}"
}
