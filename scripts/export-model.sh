#!/usr/bin/env bash
# export-model.sh — Export models to TensorFlow SavedModel via Modal GPU
#
# All model conversion runs on Modal GPU instances.
# Converted models are downloaded from Modal Volume to local MODEL_DIR.
#
# Usage:
#   ./scripts/export-model.sh whisper
#   ./scripts/export-model.sh sam2
#   ./scripts/export-model.sh realesrgan
#   ./scripts/export-model.sh --all                    # Export all models
#   ./scripts/export-model.sh --list                   # List available models
set -euo pipefail

MODEL_DIR="${MODEL_DIR:-/models}"
MODEL_CACHE="${MODEL_CACHE:-$HOME/.cache/modal}"

# ── Model Registry ──────────────────────────────────────────────────────────

declare -A MODELS=(
  ["whisper"]="whisper-large-v3"
  ["sam2"]="sam2-hiera-large"
  ["realesrgan"]="real-esrgan"
  ["mobilenet_v2"]="mobilenet-v2"
  ["efficientnet"]="efficientnet-b7"
)

list_models() {
  echo "Available models:"
  for name in "${!MODELS[@]}"; do
    echo "  $name → ${MODELS[$name]}"
  done
}

# ── Modal-based Model Export ────────────────────────────────────────────────

run_modal_export() {
  local model_name="$1"
  local model_id="${MODELS[$model_name]}"
  local output_dir="$MODEL_DIR/$model_name/1"

  echo "📦 Exporting $model_name ($model_id) via Modal GPU..."

  mkdir -p "$output_dir"

  modal run scripts/modal-export.py::export_model \
    --model-id "$model_id" \
    --model-name "$model_name"

  # Download converted model from Modal Volume
  echo "⬇️  Downloading converted model to $output_dir..."
  modal volume get lazynext-models "exports/$model_name/" "$output_dir/"

  echo "✅ $model_name exported: $output_dir"
}

# ── Main ────────────────────────────────────────────────────────────────────

case "${1:-}" in
  --list)
    list_models
    exit 0
    ;;
  --all)
    echo "🚀 Exporting ALL models via Modal GPU..."
    for name in "${!MODELS[@]}"; do
      run_modal_export "$name"
    done
    echo "✅ All models exported to $MODEL_DIR"
    echo ""
    echo "📊 Exported models:"
    du -sh "$MODEL_DIR"/*/
    ;;
  "")
    echo "Usage: $0 <model-name> | --all | --list"
    echo ""
    list_models
    exit 1
    ;;
  *)
    MODEL_NAME="$1"
    if [[ -n "${MODELS[$MODEL_NAME]:-}" ]]; then
      run_modal_export "$MODEL_NAME"
    else
      echo "❌ Unknown model: $MODEL_NAME"
      list_models
      exit 1
    fi
    ;;
esac
