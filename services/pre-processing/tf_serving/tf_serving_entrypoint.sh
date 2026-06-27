#!/usr/bin/env bash
# ==============================================================================
# tf_serving_entrypoint.sh — TensorFlow Serving Startup & Health Monitor
#
# Responsibilities:
#   1. Wait for model downloads to complete
#   2. Validate SavedModel artifacts on disk
#   3. Apply per-model batching configuration
#   4. Start tensorflow_model_server with Prometheus monitoring
#   5. Run a health-check watchdog loop
#
# Mount this at /usr/local/bin/tf_serving_entrypoint.sh inside the container.
# ==============================================================================
set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────

MODEL_BASE_PATH="${MODEL_BASE_PATH:-/models}"
REST_API_PORT="${REST_API_PORT:-8501}"
GRPC_PORT="${GRPC_PORT:-8500}"
MODEL_CONFIG_FILE="${MODEL_CONFIG_FILE:-/models/model_config.conf}"
MODEL_CONFIG_POLL_SECONDS="${MODEL_CONFIG_POLL_SECONDS:-60}"
MONITORING_CONFIG="${MONITORING_CONFIG:-/models/tf_serving/monitoring_config.txt}"
BATCHING_CONFIG="${BATCHING_CONFIG:-/models/tf_serving/batching_config.txt}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-15}"
MAX_STARTUP_WAIT="${MAX_STARTUP_WAIT:-300}"
GPU_MEMORY_FRACTION="${GPU_MEMORY_FRACTION:-0.90}"

# Models required at startup (names must match model_config.conf)
REQUIRED_MODELS=("whisper" "sam2" "realesrgan" "mobilenet_v2")

# ── Logging ──────────────────────────────────────────────────────────────────

log()  { printf '[%(%Y-%m-%dT%H:%M:%S%z)T] [tf-serving] %s\n' -1 "$*" >&2; }
warn() { printf '[%(%Y-%m-%dT%H:%M:%S%z)T] [tf-serving] WARN  %s\n' -1 "$*" >&2; }
err()  { printf '[%(%Y-%m-%dT%H:%M:%S%z)T] [tf-serving] ERROR %s\n' -1 "$*" >&2; }

# ── Signal handling ──────────────────────────────────────────────────────────

cleanup() {
    log "Shutting down..."
    if [[ -n "${TF_PID:-}" ]]; then
        kill -TERM "${TF_PID}" 2>/dev/null || true
        wait "${TF_PID}" 2>/dev/null || true
    fi
    log "Shutdown complete."
}
trap cleanup EXIT INT TERM

# ── Model validation ─────────────────────────────────────────────────────────

validate_savedmodel() {
    local model_name="$1"
    local model_dir="${MODEL_BASE_PATH}/${model_name}/1"

    if [[ ! -d "${model_dir}" ]]; then
        err "Model directory missing: ${model_dir}"
        return 1
    fi

    # A valid SavedModel directory must contain saved_model.pb OR
    # (for TF2) a .pb file + variables/ subdirectory.
    if [[ -f "${model_dir}/saved_model.pb" ]]; then
        log "  [${model_name}] Found saved_model.pb (OK)"
        return 0
    fi

    # Check for TensorFlow2-style SavedModel
    local pb_files
    pb_files=$(find "${model_dir}" -maxdepth 1 -name '*.pb' 2>/dev/null | wc -l || true)
    local has_variables=false
    [[ -d "${model_dir}/variables" ]] && has_variables=true

    if [[ ${pb_files} -gt 0 ]] && ${has_variables}; then
        log "  [${model_name}] Found TF2 SavedModel (pb + variables/) (OK)"
        return 0
    fi

    err "  [${model_name}] Invalid SavedModel — no saved_model.pb or variables/ found in ${model_dir}"
    ls -la "${model_dir}" 2>/dev/null || true
    return 1
}

wait_for_models() {
    log "Waiting for model files under ${MODEL_BASE_PATH}..."

    local elapsed=0
    while [[ ${elapsed} -lt ${MAX_STARTUP_WAIT} ]]; do
        local all_ok=true
        local missing=()

        for model in "${REQUIRED_MODELS[@]}"; do
            local version_dir="${MODEL_BASE_PATH}/${model}/1"
            if [[ -d "${version_dir}" ]]; then
                if validate_savedmodel "${model}"; then
                    continue
                fi
            fi
            all_ok=false
            missing+=("${model}")
        done

        if ${all_ok}; then
            log "All ${#REQUIRED_MODELS[@]} models validated successfully."
            return 0
        fi

        log "Still waiting for models: ${missing[*]}  (elapsed: ${elapsed}s / ${MAX_STARTUP_WAIT}s)"
        sleep 5
        elapsed=$((elapsed + 5))
    done

    err "Timed out waiting for models after ${MAX_STARTUP_WAIT}s"
    return 1
}

# ── GPU check ────────────────────────────────────────────────────────────────

check_gpu() {
    if command -v nvidia-smi &>/dev/null; then
        log "GPU(s) detected:"
        nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null || true
    else
        warn "nvidia-smi not found — running in CPU-only mode"
    fi

    # Set GPU memory fraction if CUDA_VISIBLE_DEVICES is set
    if [[ -n "${CUDA_VISIBLE_DEVICES:-}" ]]; then
        export TF_PER_PROCESS_GPU_MEMORY_FRACTION="${GPU_MEMORY_FRACTION}"
        log "GPU memory fraction: ${TF_PER_PROCESS_GPU_MEMORY_FRACTION}"
    fi
}

# ── Batching config ──────────────────────────────────────────────────────────

apply_batching_config() {
    log "Applying batching configuration..."

    if [[ -f "${BATCHING_CONFIG}" ]]; then
        log "  Batching config: ${BATCHING_CONFIG}"
        # The batching config is read by TF Serving at startup via
        # --batching_parameters_file. Export it so the launch command picks it up.
        export BATCHING_PARAMETERS_FILE="${BATCHING_CONFIG}"
    else
        warn "  No batching config found at ${BATCHING_CONFIG} — using defaults"
    fi
}

# ── Monitoring config ────────────────────────────────────────────────────────

apply_monitoring_config() {
    log "Applying monitoring configuration..."

    if [[ -f "${MONITORING_CONFIG}" ]]; then
        log "  Monitoring config: ${MONITORING_CONFIG}"
        export MONITORING_CONFIG_FILE="${MONITORING_CONFIG}"
    else
        warn "  No monitoring config found at ${MONITORING_CONFIG} — using defaults"
    fi
}

# ── Launch TF Serving ────────────────────────────────────────────────────────

launch_tf_serving() {
    log "==========================================="
    log "Starting TensorFlow Serving"
    log "  REST port:   ${REST_API_PORT}"
    log "  gRPC port:   ${GRPC_PORT}"
    log "  Model config: ${MODEL_CONFIG_FILE}"
    log "  Poll seconds: ${MODEL_CONFIG_POLL_SECONDS}"
    log "  Models base:  ${MODEL_BASE_PATH}"
    log "==========================================="

    local tf_args=(
        --rest_api_port="${REST_API_PORT}"
        --grpc_port="${GRPC_PORT}"
        --model_config_file="${MODEL_CONFIG_FILE}"
        --model_config_file_poll_wait_seconds="${MODEL_CONFIG_POLL_SECONDS}"
    )

    # Attach monitoring config if available
    if [[ -n "${MONITORING_CONFIG_FILE:-}" ]] && [[ -f "${MONITORING_CONFIG_FILE}" ]]; then
        tf_args+=(--monitoring_config_file="${MONITORING_CONFIG_FILE}")
    fi

    # Attach batching config if available
    if [[ -n "${BATCHING_PARAMETERS_FILE:-}" ]] && [[ -f "${BATCHING_PARAMETERS_FILE}" ]]; then
        tf_args+=(--batching_parameters_file="${BATCHING_PARAMETERS_FILE}")
    fi

    # Enable per-model batching
    tf_args+=(--enable_batching)

    # TensorFlow verbosity
    tf_args+=(--tensorflow_session_parallelism=4)

    log "Launching: tensorflow_model_server ${tf_args[*]}"
    tensorflow_model_server "${tf_args[@]}" &
    TF_PID=$!

    log "tensorflow_model_server PID: ${TF_PID}"
}

# ── Health-check watchdog ────────────────────────────────────────────────────

health_check_loop() {
    local rest_url="http://localhost:${REST_API_PORT}/v1/models/whisper"
    log "Starting health-check loop (interval=${HEALTH_CHECK_INTERVAL}s, url=${rest_url})"

    # Give TF Serving a moment to finish loading models
    sleep 10

    while true; do
        if ! kill -0 "${TF_PID}" 2>/dev/null; then
            err "tensorflow_model_server (PID ${TF_PID}) has died!"
            wait "${TF_PID}" 2>/dev/null
            local exit_code=$?
            err "Exit code: ${exit_code}"
            return 1
        fi

        local http_code
        http_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "${rest_url}" 2>/dev/null || echo "000")

        case "${http_code}" in
            200)
                log "Health check OK (200)"
                ;;
            000)
                warn "Health check FAILED — server unreachable (timeout or connection refused)"
                ;;
            *)
                warn "Health check returned HTTP ${http_code}"
                ;;
        esac

        sleep "${HEALTH_CHECK_INTERVAL}"
    done
}

# ── Main ─────────────────────────────────────────────────────────────────────

main() {
    log "==========================================="
    log "TensorFlow Serving Entrypoint"
    log "==========================================="

    check_gpu
    wait_for_models
    apply_batching_config
    apply_monitoring_config
    launch_tf_serving
    health_check_loop
}

main "$@"
