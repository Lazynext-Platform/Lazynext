# ── VPC Network for Lazynext (GCP) ────────────────────────────────────────
resource "google_compute_network" "vpc" {
  name                    = "lazynext-vpc-${var.environment}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "gke_subnet" {
  name          = "lazynext-gke-subnet-${var.environment}"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.gcp_region
  network       = google_compute_network.vpc.id
}
