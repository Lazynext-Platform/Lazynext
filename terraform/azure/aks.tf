# ── Azure Kubernetes Service (AKS) ───────────────────────────────────────
resource "azurerm_kubernetes_cluster" "aks" {
  name                = "lazynext-aks-${var.environment}"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  dns_prefix          = "lazynextaks-${var.environment}"
  kubernetes_version  = var.kubernetes_version

  private_cluster_enabled = true

  network_profile {
    network_plugin = "azure"
    network_policy = "azure"
  }

  default_node_pool {
    name           = "general"
    node_count     = var.node_count
    vm_size        = "Standard_D2s_v3"
    vnet_subnet_id = azurerm_subnet.aks_subnet.id
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Environment = var.environment
    Project     = "Lazynext"
  }
}

# ── GPU Node Pool for AI Processing ──
resource "azurerm_kubernetes_cluster_node_pool" "gpu_pool" {
  name                  = "gpunp"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = "Standard_NC4as_T4_v3"
  node_count            = 0
  enable_auto_scaling   = true
  min_count             = 0
  max_count             = 2
  vnet_subnet_id        = azurerm_subnet.aks_subnet.id

  node_taints = [
    "nvidia.com/gpu=true:NoSchedule"
  ]

  tags = {
    Environment = var.environment
    Project     = "Lazynext"
  }
}
