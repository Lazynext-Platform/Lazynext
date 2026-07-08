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

# Install Python deps. Several ML packages (scipy, opencv-python, torch)
# have no pre-built wheel for Python 3.13 yet. We install what we can and
# skip what we can't; the CV-model routes degrade gracefully per platform
# design (see cv_models.py).
COPY services/pre-processing/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && (pip install --no-cache-dir -r requirements.txt || pip install --no-cache-dir \
         --only-binary :all: -r requirements.txt) \
    # These need a source-build chain (meson/gcc) unavailable in slim;
    # try individually and skip on failure so the service still boots.
    && pip install --no-cache-dir scipy 2>/dev/null || true \
    && pip install --no-cache-dir opencv-python 2>/dev/null || true

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
