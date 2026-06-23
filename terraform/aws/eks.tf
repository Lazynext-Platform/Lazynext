# ── Elastic Kubernetes Service (EKS) ──────────────────────────────────────
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = "lazynext-eks-${var.environment}"
  cluster_version = "1.30"

  cluster_endpoint_public_access  = true
  cluster_endpoint_private_access = true

  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.private_subnets
  control_plane_subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    # General compute for web and API
    general = {
      min_size     = 1
      max_size     = 3
      desired_size = 2

      instance_types = ["t3.medium"]
      capacity_type  = "ON_DEMAND"
    }

    # GPU / High Memory compute for Python Pre-Processing & Gen Studio
    compute_heavy = {
      min_size     = 0
      max_size     = 2
      desired_size = 0

      instance_types = ["g4dn.xlarge"] # GPU instance for SAM2/Diffusion
      capacity_type  = "SPOT"

      taints = {
        dedicated = {
          key    = "nvidia.com/gpu"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      }
    }
  }

  tags = {
    Environment = var.environment
    Project     = "Lazynext"
  }
}
