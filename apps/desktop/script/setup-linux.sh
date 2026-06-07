#!/bin/bash
# Lazynext Desktop — Linux Setup Script (Ubuntu/Debian/Fedora/Arch)

set -e
echo "=== Lazynext Desktop — Linux Setup ==="

# Detect distro
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
else
    DISTRO="unknown"
fi

# 1. Install Rust
if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# 2. Install system deps
echo "Installing system dependencies..."
case $DISTRO in
    ubuntu|debian)
        sudo apt-get update -qq
        sudo apt-get install -y -qq \
            build-essential pkg-config cmake \
            libvulkan-dev vulkan-validationlayers \
            libxcb-render0-dev libxcb-shape0-dev libxcb-xfixes0-dev \
            libxkbcommon-dev libfontconfig-dev libgtk-3-dev \
            libssl-dev libglib2.0-dev
        ;;
    fedora|rhel|centos)
        sudo dnf install -y \
            gcc gcc-c++ make cmake \
            vulkan-devel vulkan-validation-layers \
            libxcb-devel libxkbcommon-devel fontconfig-devel \
            gtk3-devel openssl-devel
        ;;
    arch|manjaro)
        sudo pacman -S --noconfirm \
            base-devel cmake \
            vulkan-devel vulkan-validation-layers \
            libxcb libxkbcommon fontconfig gtk3 openssl
        ;;
    *)
        echo "Unknown distro: $DISTRO"
        echo "Please install: build-essential, cmake, vulkan-sdk, libxcb, libxkbcommon, fontconfig, gtk3"
        ;;
esac

# 3. Verify
echo ""
echo "=== Verification ==="
rustc --version
cargo --version
vulkaninfo --summary 2>/dev/null || echo "Vulkan not detected — will use software rendering"

echo ""
echo "=== Setup Complete ==="
echo "Run: cargo run -p lazynext-desktop"
echo ""
echo "GPU Backends available on Linux:"
echo "  - Vulkan (primary, via wgpu)"
echo "  - CPU (software fallback)"
