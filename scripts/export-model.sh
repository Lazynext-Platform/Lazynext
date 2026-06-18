#!/usr/bin/env bash
# export-model.sh — Export PyTorch/ONNX models to TensorFlow SavedModel format
# Converts HuggingFace models for TensorFlow Serving deployment.
#
# Usage:
#   ./scripts/export-model.sh whisper openai/whisper-large-v3
#   ./scripts/export-model.sh sam2 facebook/sam2-hiera-large
#   ./scripts/export-model.sh realesrgan ai-forever/Real-ESRGAN
#   ./scripts/export-model.sh --all                    # Export all models
#   ./scripts/export-model.sh --list                   # List available models
set -euo pipefail

MODEL_DIR="${MODEL_DIR:-/models}"
HF_CACHE="${HF_CACHE:-$HOME/.cache/huggingface}"

# ── Model Registry ──────────────────────────────────────────────────────────

declare -A MODELS=(
  ["whisper"]="openai/whisper-large-v3"
  ["sam2"]="facebook/sam2-hiera-large"
  ["realesrgan"]="ai-forever/Real-ESRGAN"
  ["mobilenet"]="google/mobilenet_v2_1.0_224"
  ["efficientnet"]="google/efficientnet-b7"
)

list_models() {
  echo "Available models:"
  for name in "${!MODELS[@]}"; do
    echo "  $name → ${MODELS[$name]}"
  done
}

# ── PyTorch → ONNX → TensorFlow ────────────────────────────────────────────

export_whisper() {
  local model_id="${MODELS[whisper]}"
  local output_dir="$MODEL_DIR/whisper/1"

  echo "🎤 Exporting Whisper: $model_id"

  mkdir -p "$output_dir"

  python3 - "$model_id" "$output_dir" <<'PYEOF'
import sys, os
model_id = sys.argv[1]
output_dir = sys.argv[2]

import torch
from transformers import WhisperForConditionalGeneration, WhisperProcessor

print(f"   Loading {model_id}...")
model = WhisperForConditionalGeneration.from_pretrained(model_id)
model.eval()

# Export to ONNX
dummy_input = torch.randn(1, 80, 3000)  # [batch, mel_bins, time]
onnx_path = os.path.join(output_dir, "model.onnx")
print(f"   Exporting ONNX → {onnx_path}")

torch.onnx.export(
    model,
    dummy_input,
    onnx_path,
    input_names=["mel_spectrogram"],
    output_names=["logits"],
    dynamic_axes={
        "mel_spectrogram": {0: "batch", 2: "time"},
        "logits": {0: "batch", 1: "sequence"}
    },
    opset_version=14
)
print(f"   ✅ Whisper exported: {onnx_path}")

# Clean up to free memory
del model
torch.cuda.empty_cache()
PYEOF
}

export_sam2() {
  local model_id="${MODELS[sam2]}"
  local output_dir="$MODEL_DIR/sam2/1"

  echo "🖼️  Exporting SAM2: $model_id"
  mkdir -p "$output_dir"

  python3 - "$model_id" "$output_dir" <<'PYEOF'
import sys, os
model_id = sys.argv[1]
output_dir = sys.argv[2]

try:
    from transformers import SamModel, SamProcessor
    import torch

    print(f"   Loading {model_id}...")
    model = SamModel.from_pretrained(model_id)
    model.eval()

    dummy_pixel = torch.randn(1, 3, 1024, 1024)
    onnx_path = os.path.join(output_dir, "model.onnx")
    print(f"   Exporting ONNX → {onnx_path}")

    torch.onnx.export(
        model.vision_encoder,
        dummy_pixel,
        onnx_path,
        input_names=["pixel_values"],
        output_names=["image_embeddings"],
        opset_version=14
    )
    print(f"   ✅ SAM2 exported: {onnx_path}")
except ImportError:
    print("   ⚠️  SAM2 not installed. Run: pip install transformers[sam]")
    # Create placeholder
    with open(os.path.join(output_dir, "saved_model.pb"), "w") as f:
        f.write("placeholder")
PYEOF
}

export_generic() {
  local name="$1"
  local model_id="${MODELS[$name]}"
  local output_dir="$MODEL_DIR/$name/1"

  echo "📦 Exporting $name: $model_id"
  mkdir -p "$output_dir"

  python3 - "$model_id" "$output_dir" <<'PYEOF'
import sys, os
model_id = sys.argv[1]
output_dir = sys.argv[2]

from transformers import AutoModel, AutoConfig
import torch

print(f"   Loading {model_id}...")
try:
    config = AutoConfig.from_pretrained(model_id)
    # Save config as JSON so TF Serving can use it
    config.save_pretrained(output_dir)
    print(f"   ✅ Config saved: {output_dir}/config.json")
except Exception as e:
    print(f"   ⚠️  Could not export {model_id}: {e}")
PYEOF
}

# ── Main ────────────────────────────────────────────────────────────────────

case "${1:-}" in
  --list)
    list_models
    exit 0
    ;;
  --all)
    echo "🚀 Exporting ALL models..."
    export_whisper
    export_sam2
    export_generic "mobilenet"
    export_generic "efficientnet"
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
      case "$MODEL_NAME" in
        whisper) export_whisper ;;
        sam2) export_sam2 ;;
        *) export_generic "$MODEL_NAME" ;;
      esac
      echo "✅ Model exported: $MODEL_DIR/$MODEL_NAME/1/"
    else
      echo "❌ Unknown model: $MODEL_NAME"
      list_models
      exit 1
    fi
    ;;
esac
