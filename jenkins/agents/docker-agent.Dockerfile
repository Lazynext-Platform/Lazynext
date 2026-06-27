# jenkins/agents/docker-agent.Dockerfile
# Multi-stage Jenkins agent image for Lazynext CI/CD pipelines.
# Includes all toolchains needed: Bun, Rust, Python, Node.js, Docker CLI, kubectl, Azure CLI, ffmpeg.
#
# Build:
#   docker build -t lazynext-jenkins-agent:latest -f jenkins/agents/docker-agent.Dockerfile .
#
# Push to ACR:
#   az acr login --name lazynextacrproduction
#   docker tag lazynext-jenkins-agent:latest lazynextacrproduction.azurecr.io/lazynext-jenkins-agent:latest
#   docker push lazynextacrproduction.azurecr.io/lazynext-jenkins-agent:latest

# ============================================================================
# Stage 1: Base system with essential OS packages
# ============================================================================
FROM ubuntu:24.04 AS base

SHELL ["/bin/bash", "-euo", "pipefail", "-c"]

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    TZ=UTC

# ── Install OS-level dependencies ─────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build essentials
    build-essential \
    ca-certificates \
    curl \
    wget \
    gnupg \
    software-properties-common \
    apt-transport-https \
    lsb-release \
    # Git + SSH
    git \
    git-lfs \
    openssh-client \
    # Archive + parsing
    unzip \
    zip \
    xz-utils \
    jq \
    yq \
    # Networking
    netcat-openbsd \
    httpie \
    # System utilities
    sudo \
    htop \
    tree \
    procps \
    # Libraries needed by Rust + Python builds
    pkg-config \
    libssl-dev \
    libclang-dev \
    clang \
    llvm-dev \
    cmake \
    # Libraries needed by ffmpeg / media processing
    nasm \
    yasm \
    libx264-dev \
    libx265-dev \
    libvpx-dev \
    libfdk-aac-dev \
    libmp3lame-dev \
    libopus-dev \
    libvorbis-dev \
    libass-dev \
    libfreetype6-dev \
    libfontconfig1-dev \
    # Fonts
    fonts-dejavu-core \
    fonts-liberation \
    fonts-noto-color-emoji \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ============================================================================
# Stage 2: Bun (JavaScript runtime + package manager)
# ============================================================================
FROM base AS bun-install

ENV BUN_INSTALL=/usr/local

RUN curl -fsSL https://bun.sh/install | bash -s -- bun-v1.3.14 \
    && chmod +x /usr/local/bin/bun \
    && bun --version

# ============================================================================
# Stage 3: Node.js 22 (needed for some tools like Playwright)
# ============================================================================
FROM bun-install AS node-install

ENV NODE_VERSION=22.12.0 \
    NVM_DIR=/usr/local/nvm

# Install Node.js via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && node --version \
    && npm --version \
    # Install common global tools
    && npm install -g \
        pnpm@11.9.0 \
        tsx@4.22.4 \
        typescript@6.0.3 \
    && npm cache clean --force

# ============================================================================
# Stage 4: Python 3.13
# ============================================================================
FROM node-install AS python-install

RUN add-apt-repository -y ppa:deadsnakes/ppa \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        python3.13 \
        python3.13-dev \
        python3.13-venv \
        python3.13-distutils \
        python3-pip \
        python3-setuptools \
        python3-wheel \
    && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.13 1 \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.13 1 \
    && python3.13 --version \
    # Install common Python tools
    && pip3 install --no-cache-dir \
        pipenv \
        poetry \
        virtualenv \
        pytest \
        pytest-asyncio \
        pytest-cov \
        pytest-xdist \
        pytest-benchmark \
        coverage \
        mypy \
        ruff \
        black \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ============================================================================
# Stage 5: Rust (stable + wasm target + cargo tools)
# ============================================================================
FROM python-install AS rust-install

ENV CARGO_HOME=/usr/local/cargo \
    RUSTUP_HOME=/usr/local/rustup \
    PATH=/usr/local/cargo/bin:${PATH}

# Install Rust via rustup
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- \
        -y \
        --default-toolchain stable \
        --profile minimal \
        --component rustfmt,clippy \
        --target wasm32-unknown-unknown \
    && chmod -R a+rw /usr/local/cargo /usr/local/rustup \
    # Verify
    && rustc --version \
    && cargo --version \
    && rustup component list --installed \
    # ── Install cargo tools ──
    && cargo install --locked \
        cargo-audit \
        cargo-deny \
        cargo-nextest \
    # ── Install wasm-pack ──
    && curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh \
    && wasm-pack --version \
    # ── Install wasm-opt (binaryen) for WASM optimization ──
    && apt-get update && apt-get install -y --no-install-recommends binaryen \
    && wasm-opt --version \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ============================================================================
# Stage 6: Docker CLI (for building images inside agent)
# ============================================================================
FROM rust-install AS docker-install

ENV DOCKER_VERSION=29.0.0 \
    DOCKER_BUILDX_VERSION=0.20.0

# Install Docker CLI (no daemon — uses mounted docker.sock)
RUN curl -fsSL "https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKER_VERSION}.tgz" \
        -o docker.tgz \
    && tar -xzf docker.tgz --strip-components=1 -C /usr/local/bin docker/docker \
    && rm docker.tgz \
    && chmod +x /usr/local/bin/docker \
    && docker --version \
    # ── Install Docker Buildx ──
    && mkdir -p /usr/local/lib/docker/cli-plugins \
    && curl -fsSL "https://github.com/docker/buildx/releases/download/v${DOCKER_BUILDX_VERSION}/buildx-v${DOCKER_BUILDX_VERSION}.linux-amd64" \
        -o /usr/local/lib/docker/cli-plugins/docker-buildx \
    && chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx \
    && docker buildx version

# ============================================================================
# Stage 7: kubectl + Helm
# ============================================================================
FROM docker-install AS kubectl-install

ENV KUBECTL_VERSION=1.32.0 \
    HELM_VERSION=3.17.0

# ── kubectl ──
RUN curl -fsSL "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl" \
        -o /usr/local/bin/kubectl \
    && chmod +x /usr/local/bin/kubectl \
    && kubectl version --client --output=yaml \
    # ── Helm ──
    && curl -fsSL "https://get.helm.sh/helm-v${HELM_VERSION}-linux-amd64.tar.gz" \
        -o helm.tar.gz \
    && tar -xzf helm.tar.gz --strip-components=1 -C /usr/local/bin linux-amd64/helm \
    && rm helm.tar.gz \
    && chmod +x /usr/local/bin/helm \
    && helm version --short \
    # ── kustomize (bundled with kubectl >= 1.31, but verify) ──
    && kubectl version --client | grep -q 'KustomizeVersion' \
    || (curl -fsSL "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.4.3/kustomize_v5.4.3_linux_amd64.tar.gz" \
        -o kustomize.tar.gz \
        && tar -xzf kustomize.tar.gz -C /usr/local/bin kustomize \
        && rm kustomize.tar.gz \
        && chmod +x /usr/local/bin/kustomize)

# ============================================================================
# Stage 8: Azure CLI + Trivy + FFmpeg
# ============================================================================
FROM kubectl-install AS tools-install

# ── Azure CLI ──
RUN curl -sL https://aka.ms/InstallAzureCLIDeb | bash \
    && az version --output table \
    # Install az extensions
    && az extension add --name containerapp --yes 2>/dev/null || true \
    && az extension add --name aks-preview --yes 2>/dev/null || true

# ── Trivy (security scanner) ──
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin v0.60.0 \
    && trivy --version

# ── FFmpeg 7 (static build for render service testing) ──
ENV FFMPEG_VERSION=7.1

RUN mkdir -p /usr/local/ffmpeg \
    && curl -fsSL "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz" \
        -o ffmpeg.tar.xz \
    && tar -xf ffmpeg.tar.xz --strip-components=1 -C /usr/local/ffmpeg \
    && rm ffmpeg.tar.xz \
    && ln -sf /usr/local/ffmpeg/ffmpeg /usr/local/bin/ffmpeg \
    && ln -sf /usr/local/ffmpeg/ffprobe /usr/local/bin/ffprobe \
    && ffmpeg -version | head -1 \
    && ffprobe -version | head -1

# ── Playwright system dependencies (for E2E testing) ──
RUN apt-get update && apt-get install -y --no-install-recommends \
        # Playwright deps for Chromium
        libnss3 \
        libnspr4 \
        libatk1.0-0t64 \
        libatk-bridge2.0-0t64 \
        libcups2t64 \
        libdrm2 \
        libdbus-1-3 \
        libxkbcommon0 \
        libatspi2.0-0t64 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxrandr2 \
        libgbm1 \
        libpango-1.0-0 \
        libcairo2 \
        libasound2t64 \
        # Additional fonts for Playwright rendering
        fonts-ipafont-gothic \
        fonts-wqy-zenhei \
        fonts-thai-tlwg \
        fonts-kacst \
        fonts-freefont-ttf \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ============================================================================
# Stage 9: Final agent image with non-root jenkins user
# ============================================================================
FROM tools-install AS final

# ── Create jenkins user (uid 1000, gid 1000) ──
RUN groupadd -g 1000 jenkins \
    && useradd -u 1000 -g jenkins -m -d /home/jenkins -s /bin/bash jenkins \
    # Add jenkins to docker group (gid matches host docker.sock group)
    && groupadd -g 999 docker-host || true \
    && usermod -aG docker-host jenkins \
    # Passwordless sudo for jenkins
    && echo "jenkins ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/jenkins \
    && chmod 0440 /etc/sudoers.d/jenkins

# ── Create workspace and cache directories ──
RUN mkdir -p /home/jenkins/agent \
    /home/jenkins/workspace \
    /cache/cargo \
    /cache/rustup \
    /cache/bun \
    /cache/pip \
    /cache/npm \
    /tmp/lazynext-cache \
    && chown -R jenkins:jenkins /home/jenkins /cache /tmp/lazynext-cache

# ── Set environment ──
ENV HOME=/home/jenkins \
    WORKSPACE=/home/jenkins/workspace \
    PATH=/usr/local/cargo/bin:/usr/local/bin:/usr/bin:/bin:/home/jenkins/.local/bin \
    CARGO_HOME=/cache/cargo \
    RUSTUP_HOME=/cache/rustup \
    BUN_INSTALL=/cache/bun \
    PIP_CACHE_DIR=/cache/pip \
    npm_config_cache=/cache/npm \
    SKIP_WASM_BUILD=1 \
    SKIP_ENV_VALIDATION=1 \
    PYTHONDONTWRITEBYTECODE=1

# ── Drop root for the agent process ──
USER jenkins
WORKDIR /home/jenkins/agent

# ── Verify all toolchain installations ──
RUN set -eux; \
    echo "=== Toolchain Verification ==="; \
    bun --version; \
    node --version; \
    npm --version; \
    python3.13 --version; \
    pip3 --version; \
    rustc --version; \
    cargo --version; \
    wasm-pack --version; \
    docker --version; \
    kubectl version --client=true --output=short 2>/dev/null || kubectl version --client=true; \
    helm version --short; \
    az version --output json | jq -r '."azure-cli"' || az version; \
    trivy --version; \
    ffmpeg -version | head -1; \
    git --version; \
    jq --version; \
    echo "=== All tools OK ===";

# ── Entrypoint ──
# The Jenkins docker-plugin will override this with its own agent.jar command,
# but having a default entrypoint makes the image useful for debugging.
ENTRYPOINT ["/bin/bash", "-c"]
CMD ["echo 'Jenkins agent ready — waiting for controller connection'; sleep infinity"]
