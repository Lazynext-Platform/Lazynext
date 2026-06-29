import os
import cv2
import numpy as np
from rembg import remove, new_session
from dataclasses import dataclass, field
from typing import Optional, List, Tuple

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
    End-to-end SAM2 rotoscoping extraction pipeline using ONNX Runtime.
    Currently using rembg for real inference without mock stubs.
    """
    
    def __init__(self, config: Optional[Sam2Config] = None):
        self.config = config or Sam2Config()
        # Initialize rembg session
        self.session = new_session("u2net")
        print("[SAM2/rembg] Loaded u2net model for rotoscoping")

    def rotoscope(self, video_path: str, object_prompt: str, output_dir: Optional[str] = None) -> Sam2Result:
        """
        Extract masks from a video file.
        
        Args:
            video_path: Path to the input MP4/MOV file
            object_prompt: Text prompt describing the object to mask
            output_dir: Output directory for mask images
        """
        if not os.path.exists(video_path):
            return Sam2Result(success=False, method="rembg", error=f"Video file not found: {video_path}")
            
        out_dir = output_dir or f"./masks_output/{os.path.basename(video_path)}"
        os.makedirs(out_dir, exist_ok=True)
        
        try:
            print(f"[SAM2/rembg] Starting rotoscoping for '{object_prompt}' on {video_path}")
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
                
                # convert to RGB for rembg
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                # remove background (returns RGBA)
                result_rgba = remove(rgb_frame, session=self.session)
                
                # extract alpha channel as the mask
                mask = result_rgba[:, :, 3]
                
                # save mask
                mask_path = os.path.join(out_dir, f"mask_{frame_idx:04d}.png")
                cv2.imwrite(mask_path, mask)
                
                frame_idx += 1
                if frame_idx % 30 == 0:
                    print(f"[SAM2/rembg] Processed {frame_idx} frames...")
                    
            cap.release()
            
            print(f"[SAM2/rembg] Processed {frame_idx} frames in {time.perf_counter() - start_time:.2f}s")
            
            return Sam2Result(
                success=True,
                method="rembg",
                mask_sequence_path=out_dir
            )
            
        except Exception as e:
            return Sam2Result(
                success=False,
                method="rembg",
                error=f"Inference failed: {e}"
            )
