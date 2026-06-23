# ── Google Kubernetes Engine (GKE) ───────────────────────────────────────
resource "google_container_cluster" "gke" {
  name     = "lazynext-gke-${var.environment}"
  location = var.gcp_region

  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.gke_subnet.name
}

# General compute pool
resource "google_container_node_pool" "general_nodes" {
  name       = "general-pool"
  location   = var.gcp_region
  cluster    = google_container_cluster.gke.name
  node_count = 2

  node_config {
    machine_type = "e2-medium"
    
    labels = {
      environment = var.environment
    }

    tags = ["gke-node", "lazynext-gke"]
  }
}

# GPU pool for AI 
resource "google_container_node_pool" "gpu_nodes" {
  name       = "gpu-pool"
  location   = var.gcp_region
  cluster    = google_container_cluster.gke.name

  autoscaling {
    total_min_node_count = 0
    total_max_node_count = 2
  }

  node_config {
    machine_type = "n1-standard-4"

    guest_accelerator {
      type  = "nvidia-tesla-t4"
      count = 1
    }

    taint {
      key    = "nvidia.com/gpu"
      value  = "true"
      effect = "NO_SCHEDULE"
    }

    labels = {
      environment = var.environment
    }

    tags = ["gke-node", "lazynext-gke", "gpu"]
  }
}
