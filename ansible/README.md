# Ansible

Ansible manages **bare-metal node provisioning** for Lazynext. This is used when running on self-managed hardware (GPU render nodes, on-prem K8s clusters).

## Directory Layout

```
ansible/
├── site.yml                  # Main playbook — provisions all nodes
├── playbook.yml              # Worker node configuration (includes FFmpeg)
├── inventory.ini             # Host inventory (masters, workers, GPU nodes)
├── ansible.cfg               # Ansible configuration (sudo, SSH pipelining, 20 forks)
├── requirements.yml          # Ansible Galaxy collection dependencies
├── group_vars/               # Group-level variables
│   ├── all.yml               # Common variables for all hosts
│   ├── workers.yml           # Worker node-specific variables
│   └── gpu_nodes.yml         # GPU node-specific variables
├── roles/                    # Ansible roles
│   ├── common/               # Base OS hardening, packages, firewall
│   ├── docker/               # Docker Engine + daemon configuration
│   ├── nvidia/               # NVIDIA driver + CUDA + container toolkit
│   ├── k8s/                  # Kubernetes (kubeadm, kubelet, kubectl)
│   ├── monitoring/           # Node exporter, process exporter
│   ├── postgresql/           # PostgreSQL client libraries
│   └── redis/                # Redis client + tools
└── playbooks/                # Operational playbooks
    ├── backup.yml            # Database and volume backup
    └── deploy-app.yml        # Application deployment playbook
```

## Node Groups

| Group | Purpose |
|---|---|
| `masters` | Kubernetes control plane nodes |
| `workers` | General compute (web, API, render service) |
| `gpu_nodes` | GPU-accelerated inference (SAM2, diffusion, Whisper) |

## Role Execution Order

```
common → docker → nvidia → k8s → monitoring / postgresql / redis
```

The NVIDIA role is applied to `gpu_nodes` only. GPU nodes install CUDA, NVIDIA Container Toolkit, and GPU operator dependencies for ML inference workloads.

## Usage

```bash
# Install Galaxy collections
ansible-galaxy install -r requirements.yml

# Provision all nodes (common + docker + nvidia + k8s)
ansible-playbook -i inventory.ini site.yml

# Configure workers only (adds FFmpeg for render farm)
ansible-playbook -i inventory.ini playbook.yml --limit workers

# Run backup
ansible-playbook -i inventory.ini playbooks/backup.yml

# Deploy application
ansible-playbook -i inventory.ini playbooks/deploy-app.yml
```

## Inventory Configuration

Before first use, fill in actual host IPs and credentials in `inventory.ini`. All entries are commented out by default. Example:

```ini
[masters]
master-1 ansible_host=10.0.0.10 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/lazynext_key

[workers]
worker-1 ansible_host=10.0.0.11 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/lazynext_key

[gpu_nodes]
gpu-1 ansible_host=10.0.0.20 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/lazynext_key
```

## Dependencies

| Collection | Version |
|---|---|
| `community.general` | >=9.0.0 |
| `ansible.posix` | >=1.5.0 |

## Configuration Highlights

- **SSH pipelining**: Enabled for faster execution
- **Privilege escalation**: Automatic sudo to root
- **Parallelism**: 20 forks
- **Logging**: `/var/log/ansible.log`
- **Kubernetes version**: 1.32 (set in `inventory.ini`)

This Ansible setup is designed for bare-metal/on-prem deployments.
