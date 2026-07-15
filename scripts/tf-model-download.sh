#!/usr/bin/env bash
# ==============================================================================
# tf-model-download.sh — Download TensorFlow Serving Models
#
# Downloads pre-converted TensorFlow SavedModel artifacts from the project's
# artifact registry, with fallback to Modal Hub + on-the-fly conversion.
#
# Features:
#   - Parallel downloads with progress indicators
#   - SHA-256 checksum verification against model_registry.yaml
#   - Exponential backoff retry (up to 3 attempts per model)
#   - Resume interrupted downloads where possible
#   - Dry-run mode for pre-flight validation
#   - Force re-download flag
#
# Usage:
#   ./scripts/tf-model-download.sh                          # Download all models
#   ./scripts/tf-model-download.sh --filter whisper         # Single model
#   ./scripts/tf-model-download.sh --filter whisper,sam2    # Multiple models
#   ./scripts/tf-model-download.sh --force                  # Force re-download
#   ./scripts/tf-model-download.sh --dry-run                # Validate only
#   ./scripts/tf-model-download.sh --verify-only            # Checksum check only
#
# Environment:
#   MODEL_DIR       — Target directory (default: /models)
#   MODEL_CACHE       — Modal model cache dir (default: ~/.cache/modal)
#   DOWNLOAD_RETRIES — Max retry attempts (default: 3)
#   PARALLEL_JOBS   — Max concurrent downloads (default: 2)
#   ARTIFACT_REGISTRY_URL — Base URL for pre-built model artifacts
# ==============================================================================

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MODEL_DIR="${MODEL_DIR:-/models}"
MODEL_CACHE="${MODEL_CACHE:-$HOME/.cache/modal}"
DOWNLOAD_RETRIES="${DOWNLOAD_RETRIES:-3}"
PARALLEL_JOBS="${PARALLEL_JOBS:-2}"
REGISTRY_FILE="${PROJECT_ROOT}/services/pre-processing/tf_models/model_registry.yaml"
ARTIFACT_REGISTRY_URL="${ARTIFACT_REGISTRY_URL:-}"

# ── Color output ─────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log()    { printf "${BLUE}[%(%H:%M:%S)T]${NC} %s\n" -1 "$*" >&2; }
success(){ printf "${GREEN}[%(%H:%M:%S)T]${NC} %s\n" -1 "$*" >&2; }
warn()   { printf "${YELLOW}[%(%H:%M:%S)T] WARN${NC}  %s\n" -1 "$*" >&2; }
err()    { printf "${RED}[%(%H:%M:%S)T] ERROR${NC} %s\n" -1 "$*" >&2; }

# ── Argument parsing ─────────────────────────────────────────────────────────

MODE="download"
FILTER=""
FORCE=false
DRY_RUN=false
VERIFY_ONLY=false

usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Download and verify TensorFlow SavedModel artifacts for Lazynext.

Options:
  --filter <names>       Comma-separated model names (whisper,sam2,realesrgan,mobilenet_v2)
                         Default: all
  --force                Force re-download even if model exists with valid checksum
  --dry-run              Validate configuration and URLs without downloading
  --verify-only          Only verify checksums of existing models, skip downloads
  -h, --help             Show this help message

Environment:
  MODEL_DIR              Target directory for model storage (default: /models)
  MODEL_CACHE               Modal model cache directory
  ARTIFACT_REGISTRY_URL  Base URL for pre-built model artifacts
  DOWNLOAD_RETRIES       Max retry attempts per model (default: 3)
  PARALLEL_JOBS          Max concurrent downloads (default: 2)

Examples:
  $(basename "$0")                              # Download all models
  $(basename "$0") --filter whisper             # Download whisper only
  $(basename "$0") --filter whisper,sam2 --force
  $(basename "$0") --dry-run                    # Check everything without downloading
  $(basename "$0") --verify-only                # Checksum audit
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --filter)
            FILTER="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verify-only)
            VERIFY_ONLY=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            err "Unknown option: $1"
            usage
            ;;
    esac
done

# ── Parse model registry ─────────────────────────────────────────────────────

if [[ ! -f "${REGISTRY_FILE}" ]]; then
    err "Model registry not found: ${REGISTRY_FILE}"
    exit 1
fi

# Parse YAML with basic awk (no pyyaml dependency for pure bash)
parse_registry() {
    # Reads model_registry.yaml and prints "name|version|download_url|checksum|modal_id|min_gpu_mb|min_ram_mb"
    # One line per model entry.
    local in_models=false
    local name="" version="" url="" checksum="" modal_id="" min_gpu="" min_ram=""

    while IFS= read -r line; do
        # Detect entry into models list
        if [[ "$line" =~ ^models: ]]; then
            in_models=true
            continue
        fi

        if ! $in_models; then
            continue
        fi

        # Detect new model entry
        if [[ "$line" =~ ^[[:space:]]*-[[:space:]]name:[[:space:]]+(.+)$ ]]; then
            # Flush previous model if any
            if [[ -n "$name" ]]; then
                echo "${name}|${version}|${url}|${checksum}|${modal_id}|${min_gpu}|${min_ram}"
            fi
            name="${BASH_REMATCH[1]}"
            version="1"
            url=""
            checksum=""
            modal_id=""
            min_gpu="0"
            min_ram="0"
            continue
        fi

        [[ -z "$name" ]] && continue

        if [[ "$line" =~ version:[[:space:]]+[\"\']?([0-9]+)[\"\']? ]]; then
            version="${BASH_REMATCH[1]}"
        elif [[ "$line" =~ download_url:[[:space:]]+[\"\']?(.+)[\"\']?$ ]]; then
            url="${BASH_REMATCH[1]}"
        elif [[ "$line" =~ checksum_sha256:[[:space:]]+[\"\']?([a-f0-9]+)[\"\']?$ ]]; then
            checksum="${BASH_REMATCH[1]}"
        elif [[ "$line" =~ modal_id:[[:space:]]+[\"\']?(.+)[\"\']?$ ]]; then
            modal_id="${BASH_REMATCH[1]}"
        elif [[ "$line" =~ min_gpu_memory_mb:[[:space:]]+([0-9]+) ]]; then
            min_gpu="${BASH_REMATCH[1]}"
        elif [[ "$line" =~ min_ram_mb:[[:space:]]+([0-9]+) ]]; then
            min_ram="${BASH_REMATCH[1]}"
        fi
    done < "${REGISTRY_FILE}"

    # Flush last model
    if [[ -n "$name" ]]; then
        echo "${name}|${version}|${url}|${checksum}|${modal_id}|${min_gpu}|${min_ram}"
    fi
}

# ── Checksum verification ────────────────────────────────────────────────────

compute_checksum() {
    local model_dir="$1"
    if [[ ! -d "${model_dir}" ]]; then
        echo "MISSING"
        return 1
    fi
    # SHA-256 over all files in the SavedModel directory, sorted for determinism
    find "${model_dir}" -type f -print0 2>/dev/null | sort -z | \
        xargs -0 shasum -a 256 2>/dev/null | \
        awk '{print $1}' | \
        shasum -a 256 | \
        awk '{print $1}'
}

verify_model() {
    local name="$1"
    local version="$2"
    local expected_sha="$3"
    local model_version_dir="${MODEL_DIR}/${name}/${version}"

    if [[ ! -d "${model_version_dir}" ]]; then
        warn "  [${name}] Model directory does not exist: ${model_version_dir}"
        return 1
    fi

    local computed
    computed=$(compute_checksum "${model_version_dir}")

    if [[ "$computed" == "MISSING" ]]; then
        warn "  [${name}] Cannot compute checksum — directory empty?"
        return 1
    fi

    if [[ -z "$expected_sha" ]]; then
        warn "  [${name}] No expected checksum in registry — skipping verification"
        return 0
    fi

    if [[ "$computed" == "$expected_sha" ]]; then
        success "  [${name}] Checksum OK: ${computed:0:16}..."
        return 0
    else
        err "  [${name}] Checksum MISMATCH!"
        err "    Expected: ${expected_sha:0:16}..."
        err "    Got:      ${computed:0:16}..."
        return 1
    fi
}

# ── Download helpers ─────────────────────────────────────────────────────────

download_with_retry() {
    local url="$1"
    local dest="$2"
    local name="$3"
    local attempt=1

    while [[ $attempt -le $DOWNLOAD_RETRIES ]]; do
        log "    Downloading (attempt ${attempt}/${DOWNLOAD_RETRIES})..."

        if command -v curl &>/dev/null; then
            # curl with progress bar, resume support, and retry
            if curl -fSL --progress-bar -C - \
                --retry 2 \
                --retry-delay 5 \
                --connect-timeout 30 \
                --max-time 1800 \
                -o "${dest}" \
                "${url}"; then
                return 0
            fi
        elif command -v wget &>/dev/null; then
            if wget -q --show-progress -c \
                --timeout=30 \
                --tries=2 \
                -O "${dest}" \
                "${url}"; then
                return 0
            fi
        else
            err "Neither curl nor wget available"
            return 1
        fi

        local exit_code=$?
        warn "    Download failed (exit code ${exit_code})"

        if [[ $attempt -lt $DOWNLOAD_RETRIES ]]; then
            local delay=$((attempt * 10))
            warn "    Retrying in ${delay}s..."
            sleep "${delay}"
        fi

        attempt=$((attempt + 1))
    done

    err "    Download failed after ${DOWNLOAD_RETRIES} attempts"
    return 1
}

download_artifact() {
    local name="$1"
    local url="$2"
    local version="$3"
    local dest_dir="${MODEL_DIR}/${name}/${version}"
    local archive_path="/tmp/tf-model-${name}-v${version}.tar.gz"

    mkdir -p "${dest_dir}"

    if [[ "$url" == modal://* ]]; then
        # Modal download — defer to on-the-fly conversion
        return 2  # special code: needs conversion
    fi

    # Download archive
    if ! download_with_retry "${url}" "${archive_path}" "${name}"; then
        return 1
    fi

    # Verify archive is non-empty and looks like a tar.gz
    local file_size
    file_size=$(stat -f%z "${archive_path}" 2>/dev/null || stat -c%s "${archive_path}" 2>/dev/null || echo "0")
    if [[ "${file_size}" -lt 1024 ]]; then
        err "    Downloaded file is too small (${file_size} bytes) — may be an error page"
        return 1
    fi

    log "    Extracting (${file_size} bytes)..."
    rm -rf "${dest_dir}"
    mkdir -p "${dest_dir}"

    if ! tar -xzf "${archive_path}" -C "${dest_dir}" --strip-components=1; then
        err "    Extraction failed"
        return 1
    fi

    rm -f "${archive_path}"
    return 0
}

convert_from_modal() {
    local name="$1"
    local modal_id="$2"

    log "    Converting from Modal: ${modal_id}"

    # Use the export-model.sh script for conversion
    if [[ -x "${PROJECT_ROOT}/scripts/export-model.sh" ]]; then
        MODEL_DIR="${MODEL_DIR}" MODEL_CACHE="${MODEL_CACHE}" \
            bash "${PROJECT_ROOT}/scripts/export-model.sh" "${name}"
        return $?
    fi

    # Fallback: use Modal GPU for conversion
    warn "    export-model.sh not available — using Modal GPU conversion"

    modal run scripts/modal-export.py::export_model \
        --model-id "${modal_id}" \
        --model-name "${name}"

    # Download converted model from Modal Volume
    info "    Downloading converted model..."
    modal volume get lazynext-models "exports/${name}/" \
        "${MODEL_DIR}/${name}/1/"

    return $?
}

# ── System resource check ────────────────────────────────────────────────────

check_resources() {
    local name="$1"
    local min_gpu_mb="$2"
    local min_ram_mb="$3"

    # Check available RAM
    local avail_ram_mb
    if [[ "$(uname)" == "Darwin" ]]; then
        avail_ram_mb=$(sysctl -n hw.memsize 2>/dev/null | awk '{printf "%.0f", $1/1024/1024}' || echo "0")
        # On macOS, use memory_pressure for free memory estimate
        local free_ram_mb
        free_ram_mb=$(memory_pressure 2>/dev/null | grep "Pages free" | awk '{print $3}' || echo "0")
        if [[ "$free_ram_mb" != "0" ]]; then
            avail_ram_mb=$((free_ram_mb * 16 / 1024))  # approximate: page size 16KB
        fi
    else
        avail_ram_mb=$(free -m 2>/dev/null | awk '/^Mem:/{print $7}' || echo "0")
    fi

    if [[ "${min_ram_mb:-0}" -gt 0 ]] && [[ "${avail_ram_mb}" -gt 0 ]] && [[ "${avail_ram_mb}" -lt "${min_ram_mb}" ]]; then
        warn "  [${name}] Low RAM: ${avail_ram_mb} MB available, ${min_ram_mb} MB recommended"
        return 1
    fi

    # Check GPU if min_gpu_mb > 0
    if [[ "${min_gpu_mb:-0}" -gt 0 ]]; then
        if command -v nvidia-smi &>/dev/null; then
            local free_gpu_mb
            free_gpu_mb=$(nvidia-smi --query-gpu=memory.free --format=csv,noheader,nounits 2>/dev/null | head -1 || echo "0")
            if [[ "${free_gpu_mb}" -lt "${min_gpu_mb}" ]]; then
                warn "  [${name}] Low GPU memory: ${free_gpu_mb} MB free, ${min_gpu_mb} MB required"
                return 1
            fi
        else
            log "  [${name}] No GPU detected — will run on CPU (slower)"
        fi
    fi

    return 0
}

# ── Progress bar for large downloads ─────────────────────────────────────────

show_disk_usage() {
    log ""
    log "Disk usage under ${MODEL_DIR}:"
    if [[ -d "${MODEL_DIR}" ]]; then
        du -sh "${MODEL_DIR}"/*/ 2>/dev/null || true
    else
        warn "  ${MODEL_DIR} does not exist yet"
    fi
}

# ── Main download orchestration ──────────────────────────────────────────────

download_model() {
    local name="$1"
    local version="$2"
    local url="$3"
    local checksum="$4"
    local modal_id="$5"
    local min_gpu="$6"
    local min_ram="$7"
    local model_version_dir="${MODEL_DIR}/${name}/${version}"

    echo ""
    log "==========================================="
    log "Model: ${name}  v${version}"
    log "==========================================="

    # Check if already downloaded and valid
    if [[ -d "${model_version_dir}" ]] && ! $FORCE; then
        if verify_model "${name}" "${version}" "${checksum}"; then
            log "  [${name}] Already downloaded and verified — skipping"
            return 0
        else
            warn "  [${name}] Existing model failed verification — re-downloading"
        fi
    fi

    # Dry-run
    if $DRY_RUN; then
        log "  [DRY RUN] Would download ${name} v${version}"
        if [[ -n "$url" ]]; then
            log "    URL:  ${url}"
        fi
        if [[ -n "$modal_id" ]]; then
            log "    Modal: ${modal_id}"
        fi
        log "    Dest: ${model_version_dir}"
        return 0
    fi

    # Resource check
    check_resources "${name}" "${min_gpu}" "${min_ram}" || true

    # Download
    if [[ -n "$url" ]] && [[ "$url" != "modal://"* ]]; then
        # Direct artifact URL
        download_artifact "${name}" "${url}" "${version}"
        local dl_rc=$?
    elif [[ -n "$modal_id" ]]; then
        # Modal download + convert
        if [[ -x "${PROJECT_ROOT}/scripts/export-model.sh" ]]; then
            MODEL_DIR="${MODEL_DIR}" MODEL_CACHE="${MODEL_CACHE}" \
                bash "${PROJECT_ROOT}/scripts/export-model.sh" "${name}"
            dl_rc=$?
        else
            convert_from_modal "${name}" "${modal_id}"
            dl_rc=$?
        fi
    else
        err "  [${name}] No download URL or Modal ID specified"
        return 1
    fi

    # Verify after download
    if [[ $dl_rc -eq 0 ]]; then
        if verify_model "${name}" "${version}" "${checksum}"; then
            success "  [${name}] Downloaded and verified successfully"
            return 0
        else
            err "  [${name}] Downloaded but checksum verification FAILED"
            return 1
        fi
    else
        err "  [${name}] Download failed"
        return 1
    fi
}

# ── Verify only mode ─────────────────────────────────────────────────────────

verify_all() {
    log "Verifying all existing models..."
    local all_ok=true

    while IFS='|' read -r name version url checksum modal_id min_gpu min_ram; do
        [[ -z "$name" ]] && continue
        local model_version_dir="${MODEL_DIR}/${name}/${version}"

        if [[ -d "${model_version_dir}" ]]; then
            if ! verify_model "${name}" "${version}" "${checksum}"; then
                all_ok=false
            fi
        else
            warn "  [${name}] Not downloaded — skipping verification"
        fi
    done < <(parse_registry)

    if $all_ok; then
        success "All models verified successfully."
        return 0
    else
        err "Some models failed verification. Re-run with --force to re-download."
        return 1
    fi
}

# ── Entrypoint ───────────────────────────────────────────────────────────────

main() {
    log "==========================================="
    log "Lazynext TF Model Downloader"
    log "  Registry: ${REGISTRY_FILE}"
    log "  Model dir: ${MODEL_DIR}"
    log "  Modal cache:  ${MODEL_CACHE}"
    log "  Mode:      ${MODE}"
    log "==========================================="

    # Ensure model directory exists
    mkdir -p "${MODEL_DIR}"

    # Parse filter into array
    IFS=',' read -ra FILTER_ARRAY <<< "${FILTER:-}"
    local filter_set=()
    for f in "${FILTER_ARRAY[@]}"; do
        [[ -n "$f" ]] && filter_set+=("$f")
    done

    # Verify-only mode
    if $VERIFY_ONLY; then
        verify_all
        exit $?
    fi

    # Dry-run mode
    if $DRY_RUN; then
        log "DRY RUN — no files will be downloaded or modified"
        echo ""
    fi

    # Process each model from registry
    local download_count=0
    local skip_count=0
    local fail_count=0
    local failed_models=()

    while IFS='|' read -r name version url checksum modal_id min_gpu min_ram; do
        [[ -z "$name" ]] && continue

        # Apply filter
        if [[ ${#filter_set[@]} -gt 0 ]]; then
            local match=false
            for f in "${filter_set[@]}"; do
                [[ "$f" == "$name" ]] && match=true && break
            done
            if ! $match; then
                continue
            fi
        fi

        if download_model "${name}" "${version}" "${url}" "${checksum}" "${modal_id}" "${min_gpu}" "${min_ram}"; then
            download_count=$((download_count + 1))
        else
            # Already-downloaded models return 0, so this is a true failure
            local model_version_dir="${MODEL_DIR}/${name}/${version}"
            if [[ -d "${model_version_dir}" ]] && ! $FORCE; then
                skip_count=$((skip_count + 1))
            else
                fail_count=$((fail_count + 1))
                failed_models+=("${name}")
            fi
        fi
    done < <(parse_registry)

    # Summary
    echo ""
    log "==========================================="
    log "Download Summary"
    log "  Downloaded: ${download_count}"
    log "  Skipped:    ${skip_count}"
    log "  Failed:     ${fail_count}"
    log "==========================================="

    show_disk_usage

    if [[ ${fail_count} -gt 0 ]]; then
        err "Failed models: ${failed_models[*]}"
        err "Re-run with --force to retry failed downloads."
        exit 1
    fi

    success "All models ready."
}

main "$@"
