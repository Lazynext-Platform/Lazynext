# ── Azure Kubernetes Service (AKS) ─────────────────────────────────────────
# Production Kubernetes cluster for GPU workloads and advanced orchestration

resource "azurerm_kubernetes_cluster" "aks" {
  name                = "lazynext-aks-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "lazynextaks-${var.environment}"
  kubernetes_version  = var.kubernetes_version

  # Azure AD integration with Kubernetes RBAC
  azure_active_directory_role_based_access_control {
    azure_rbac_enabled = true
    tenant_id          = data.azurerm_client_config.current.tenant_id
  }

  # Use Azure CNI for native VNet integration
  network_profile {
    network_plugin      = "azure"
    network_policy      = "azure"
    network_plugin_mode = "overlay"
  }

  default_node_pool {
    name           = "general"
    node_count     = var.node_count
    vm_size        = "Standard_D2s_v3"
    vnet_subnet_id = azurerm_subnet.aks.id
    os_sku         = "Ubuntu"
    os_disk_size_gb = 30
  }

  identity {
    type = "SystemAssigned"
  }

  # Enable Workload Identity (IRSA equivalent for Azure)
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  monitor_metrics {}

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}

# ── GPU Node Pool ───────────────────────────────────────────────────────────

resource "azurerm_kubernetes_cluster_node_pool" "gpu" {
  name                  = "gpunp"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = "Standard_NC4as_T4_v3" # 4 vCPU, 28 GiB, 1x T4 GPU (matches GCP n1-standard-4 + T4)
  node_count            = 0
  auto_scaling_enabled  = true
  min_count             = 0
  max_count             = 2
  vnet_subnet_id        = azurerm_subnet.aks.id
  os_sku                = "Ubuntu"
  priority              = "Spot"
  eviction_policy       = "Delete"

  node_labels = {
    "nvidia.com/gpu"         = "true"
    "node.kubernetes.io/gpu" = "nvidia-t4"
  }

  node_taints = [
    "nvidia.com/gpu=true:NoSchedule"
  ]

  tags = {
    Environment = var.environment
    Project     = "lazynext"
  }
}
