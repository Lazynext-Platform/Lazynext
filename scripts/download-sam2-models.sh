#!/bin/bash
# Download SAM2 ONNX model files for real AI segmentation.
# SAM2 (Segment Anything Model 2) by Meta AI Research.
# https://github.com/facebookresearch/sam2
#
# Model files:
#   - sam2_hiera_large_encoder.onnx  (~340 MB)
#   - sam2_hiera_large_decoder.onnx  (~140 MB)
#
# Total download: ~480 MB
#
# Usage: ./scripts/download-sam2-models.sh

set -e

MODEL_DIR="${1:-models/sam2}"
BASE_URL="https://modal.com/facebook/sam2-hiera-large/resolve/main"

echo "🔽 Downloading SAM2 ONNX models..."
echo "   Target directory: $MODEL_DIR"
mkdir -p "$MODEL_DIR"

download() {
    local file="$1"
    local url="$BASE_URL/$file"
    local dest="$MODEL_DIR/$file"

    if [ -f "$dest" ]; then
        echo "   ✅ $file already exists — skipping."
        return
    fi

    echo "   📥 Downloading $file..."
    if command -v wget &>/dev/null; then
        wget -q --show-progress "$url" -O "$dest"
    elif command -v curl &>/dev/null; then
        curl -L --progress-bar "$url" -o "$dest"
    else
        echo "   ❌ Neither wget nor curl found. Please install one."
        exit 1
    fi
    echo "   ✅ $file downloaded."
}

# Download ONNX model files
download "sam2_hiera_large_encoder.onnx"
download "sam2_hiera_large_decoder.onnx"

echo ""
echo "✅ SAM2 models downloaded to $MODEL_DIR/"
echo ""
echo "To enable real SAM2 inference:"
echo "  1. Build with ONNX features:"
echo "     cargo build --features onnx -p masks"
echo ""
echo "  2. Set the model path env var:"
echo "     export SAM2_MODEL_DIR=$(pwd)/$MODEL_DIR"
echo ""
echo "  3. The SAM2 engine will automatically use real AI inference"
echo "     when ONNX models are available, falling back to geometric"
echo "     masks otherwise."
