# ── Pre-Processing Service (Python 3.13) ──
FROM python:3.13-slim

WORKDIR /app

# System deps for OpenCV, PyTorch, and scientific computing
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY services/pre-processing/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt \
    # numba does not support Python 3.13; install if possible, skip on failure
    && pip install --no-cache-dir numba llvmlite 2>/dev/null || true

# Copy application source
COPY services/pre-processing/ ./

# Runtime user
RUN groupadd --system --gid 1001 python && useradd --system --uid 1001 --gid python mlrunner
RUN mkdir -p /tmp/preprocessing && chown -R mlrunner:python /tmp/preprocessing /app
USER mlrunner

# Runtime config
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV NUMBA_CACHE_DIR=/tmp
ENV NUMBA_DISABLE_JIT=1
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -sf http://localhost:8000/ || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
