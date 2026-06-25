# ── Database Outputs ────────────────────────────────────────────────────────
output "db_instance_connection_name" {
  description = "The connection name of the PostgreSQL instance"
  value       = google_sql_database_instance.postgres.connection_name
}

output "db_public_ip_address" {
  description = "The public IP address of the PostgreSQL instance"
  value       = google_sql_database_instance.postgres.public_ip_address
}

output "db_private_ip_address" {
  description = "The private IP address of the PostgreSQL instance"
  value       = google_sql_database_instance.postgres.private_ip_address
}

# ── Storage Outputs ─────────────────────────────────────────────────────────
output "gcs_media_bucket_name" {
  description = "The name of the GCS media bucket"
  value       = google_storage_bucket.media.name
}

output "gcs_media_bucket_url" {
  description = "The URL of the GCS media bucket"
  value       = google_storage_bucket.media.url
}

# ── Cloud Run Outputs ───────────────────────────────────────────────────────
output "cloud_run_web_url" {
  description = "The URL of the Web App Cloud Run service"
  value       = google_cloud_run_v2_service.web.uri
}

output "cloud_run_ai_agents_url" {
  description = "The URL of the AI Agents Cloud Run service"
  value       = google_cloud_run_v2_service.ai_agents.uri
}

output "cloud_run_render_url" {
  description = "The URL of the Render Service Cloud Run service"
  value       = google_cloud_run_v2_service.render_service.uri
}

output "cloud_run_pre_processing_url" {
  description = "The URL of the Pre-Processing Cloud Run service"
  value       = google_cloud_run_v2_service.pre_processing.uri
}

output "cloud_run_gen_studio_url" {
  description = "The URL of the Generative Studio Cloud Run service"
  value       = google_cloud_run_v2_service.generative_studio.uri
}

# ── VPC Outputs ─────────────────────────────────────────────────────────────
output "vpc_id" {
  description = "The ID of the VPC network"
  value       = google_compute_network.vpc.id
}

output "gke_subnet_id" {
  description = "The ID of the GKE subnet"
  value       = google_compute_subnetwork.gke_subnet.id
}

# ── GKE Outputs ─────────────────────────────────────────────────────────────
output "gke_cluster_name" {
  description = "The name of the GKE cluster"
  value       = google_container_cluster.gke.name
}

output "gke_cluster_endpoint" {
  description = "The endpoint of the GKE cluster"
  value       = google_container_cluster.gke.endpoint
}

# ── Service Account ─────────────────────────────────────────────────────────
output "cloud_run_service_account_email" {
  description = "The email of the Cloud Run service account"
  value       = google_service_account.cloud_run_sa.email
}
