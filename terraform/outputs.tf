output "db_instance_connection_name" {
  description = "The connection name of the PostgreSQL instance"
  value       = google_sql_database_instance.postgres.connection_name
}

output "db_public_ip_address" {
  description = "The public IP address of the PostgreSQL instance"
  value       = google_sql_database_instance.postgres.public_ip_address
}

output "gcs_media_bucket_name" {
  description = "The name of the GCS media bucket"
  value       = google_storage_bucket.media.name
}

output "cloud_run_web_url" {
  description = "The URL of the Web App Cloud Run service"
  value       = google_cloud_run_v2_service.web.uri
}
