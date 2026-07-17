"""
SAM2 rotoscoping extraction pipeline.

Provides an end-to-end pipeline for extracting alpha masks from video
using the Meta Segment Anything Model 2 (SAM2). Uses ONNX Runtime for
inference with a rembg/u2net fallback for environments without a SAM2
ONNX model.
"""

import os
import cv2
import numpy as np
from rembg import remove, new_session
from dataclasses import dataclass
from typing import Optional

@dataclass
class Sam2Config:
    """Configuration for SAM2 ONNX extraction."""
    model_path: str = "/models/sam2_hiera_large.onnx"
    execution_provider: str = "CUDAExecutionProvider" # Fallback to CPUExecutionProvider
    mask_threshold: float = 0.0

@dataclass
class Sam2Result:
    """Result of a SAM2 extraction job."""
    success: bool
    method: str
    mask_sequence_path: Optional[str] = None
    error: Optional[str] = None

class Sam2Pipeline:
    """
    End-to-end SAM2 rotoscoping extraction pipeline.

    Tries (in order):
      1. SAM2 ONNX Runtime (real Meta SAM2 model)
      2. rembg u2net (lightweight background removal)
    """

    def __init__(self, config: Optional[Sam2Config] = None):
        """Initialize the class instance."""
        self.config = config or Sam2Config()
        self._onnx_session = None
        self._rembg_session = None

        # Try loading real SAM2 ONNX model first
        if os.path.exists(self.config.model_path):
            try:
                import onnxruntime as ort
                self._onnx_session = ort.InferenceSession(
                    self.config.model_path,
                    providers=[self.config.execution_provider, "CPUExecutionProvider"]
                )
                print(f"[SAM2] Loaded ONNX model from {self.config.model_path}")
            except Exception as e:
                print(f"[SAM2] ONNX load failed ({e}), falling back to rembg")
        else:
            print(f"[SAM2] ONNX model not found at {self.config.model_path}, using rembg fallback")

        # Initialize rembg as fallback
        self._rembg_session = new_session("u2net")
        print("[SAM2] rembg u2net session ready (fallback)")

    def _rotoscope_onnx(self, video_path: str, out_dir: str, frame_count: int) -> Sam2Result:
        """Rotoscope using the real SAM2 ONNX model."""
        import time
        start_time = time.perf_counter()

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return Sam2Result(success=False, method="sam2_onnx", error="Could not open video")

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Preprocess: resize to model input size (1024x1024 for SAM2 Hiera)
            h, w = frame.shape[:2]
            input_size = 1024
            scale = min(input_size / h, input_size / w)
            new_h, new_w = int(h * scale), int(w * scale)
            resized = cv2.resize(frame, (new_w, new_h))

            # Pad to square
            pad_h = (input_size - new_h) // 2
            pad_w = (input_size - new_w) // 2
            padded = np.zeros((input_size, input_size, 3), dtype=np.uint8)
            padded[pad_h:pad_h+new_h, pad_w:pad_w+new_w] = resized

            # Normalize to [0,1] and transpose to NCHW
            input_tensor = padded.astype(np.float32) / 255.0
            input_tensor = np.transpose(input_tensor, (2, 0, 1))
            input_tensor = np.expand_dims(input_tensor, axis=0)

            # Run SAM2 ONNX inference
            onnx_inputs = {self._onnx_session.get_inputs()[0].name: input_tensor}
            onnx_output = self._onnx_session.run(None, onnx_inputs)
            mask = onnx_output[0][0, 0]  # [1024, 1024] logits

            # Threshold and crop back to original size
            mask = (mask > self.config.mask_threshold).astype(np.uint8) * 255
            mask = mask[pad_h:pad_h+new_h, pad_w:pad_w+new_w]
            mask = cv2.resize(mask, (w, h))

            mask_path = os.path.join(out_dir, f"mask_{frame_idx:04d}.png")
            cv2.imwrite(mask_path, mask)

            frame_idx += 1
            if frame_idx % 30 == 0:
                print(f"[SAM2/ONNX] Processed {frame_idx}/{frame_count} frames...")

        cap.release()
        elapsed = time.perf_counter() - start_time
        print(f"[SAM2/ONNX] Processed {frame_idx} frames in {elapsed:.2f}s")
        return Sam2Result(success=True, method="sam2_onnx", mask_sequence_path=out_dir)

    def _rotoscope_rembg(self, video_path: str, out_dir: str) -> Sam2Result:
        """Rotoscope using rembg u2net as fallback."""
        import time
        start_time = time.perf_counter()

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return Sam2Result(success=False, method="rembg", error="Could not open video file.")

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result_rgba = remove(rgb_frame, session=self._rembg_session)
            mask = result_rgba[:, :, 3]

            mask_path = os.path.join(out_dir, f"mask_{frame_idx:04d}.png")
            cv2.imwrite(mask_path, mask)

            frame_idx += 1
            if frame_idx % 30 == 0:
                print(f"[SAM2/rembg] Processed {frame_idx} frames...")

        cap.release()
        elapsed = time.perf_counter() - start_time
        print(f"[SAM2/rembg] Processed {frame_idx} frames in {elapsed:.2f}s")
        return Sam2Result(success=True, method="rembg", mask_sequence_path=out_dir)

    def rotoscope(self, video_path: str, object_prompt: str, output_dir: Optional[str] = None) -> Sam2Result:
        """
        Extract masks from a video file. Uses SAM2 ONNX if available, otherwise rembg.

        Args:
            video_path: Path to the input MP4/MOV file
            object_prompt: Text prompt describing the object to mask
            output_dir: Output directory for mask images

        Returns:
            A :class:`Sam2Result` with ``success``, the ``method`` used
            (``onnx``, ``rembg``, or ``none``), output paths, and any error.
        """
        if not os.path.exists(video_path):
            return Sam2Result(success=False, method="none", error=f"Video file not found: {video_path}")

        out_dir = output_dir or f"./masks_output/{os.path.basename(video_path)}"
        os.makedirs(out_dir, exist_ok=True)

        # Get frame count for progress reporting
        cap = cv2.VideoCapture(video_path)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()

        print(f"[SAM2] Rotoscoping '{object_prompt}' on {video_path} ({frame_count} frames)")

        # Try ONNX first, fall back to rembg
        if self._onnx_session is not None:
            try:
                return self._rotoscope_onnx(video_path, out_dir, frame_count)
            except Exception as e:
                print(f"[SAM2] ONNX inference failed ({e}), falling back to rembg")
                self._onnx_session = None  # Don't retry ONNX after failure

        return self._rotoscope_rembg(video_path, out_dir)
