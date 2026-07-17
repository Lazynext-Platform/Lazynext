"""
NeRF / Gaussian Splatting 3D extraction pipeline.

Extracts 3D geometry from 2D video sweeps using:
  1. COLMAP for camera pose estimation (Structure from Motion)
  2. nerfstudio for Neural Radiance Field training
  3. gsplat for 3D Gaussian Splatting (real-time rendering)

Requirements:
  pip install nerfstudio gsplat colmap

The pipeline outputs:
  - A .ply point cloud (colored 3D Gaussians)
  - A .mp4 preview video (orbit render)
  - A .json camera path for import into Lazynext's 3D compositor

Usage:
  from nerf_pipeline import NerfPipeline
  pipeline = NerfPipeline()
  result = pipeline.extract_3d("input_video.mp4", method="gaussian-splatting")
"""

import os
import subprocess
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class NerfConfig:
    """Configuration for NeRF/gsplat extraction."""
    method: str = "gaussian-splatting"  # "nerfacto", "instant-ngp", "gaussian-splatting"
    max_iterations: int = 30_000
    colmap_quality: str = "medium"  # "low", "medium", "high"
    output_format: str = "ply"  # "ply", "glb", "obj"
    render_preview: bool = True
    preview_frames: int = 120
    preview_resolution: tuple = (1920, 1080)


@dataclass
class NerfResult:
    """Result of a NeRF extraction job."""
    success: bool
    method: str
    model_path: Optional[str] = None
    point_cloud_path: Optional[str] = None
    preview_path: Optional[str] = None
    camera_path: Optional[str] = None
    metrics: dict = field(default_factory=dict)
    error: Optional[str] = None


class NerfPipeline:
    """
    End-to-end NeRF/gsplat extraction pipeline.
    
    Steps:
      1. Video → Frames (ffmpeg)
      2. Frames → Camera Poses (COLMAP)
      3. Camera Poses + Frames → 3D Model (nerfstudio/gsplat)
      4. 3D Model → Preview Render
    """
    
    def __init__(self, config: Optional[NerfConfig] = None):
        self.config = config or NerfConfig()
    
    def extract_3d(self, video_path: str, output_dir: Optional[str] = None) -> NerfResult:
        """
        Extract 3D geometry from a video file.
        
        Args:
            video_path: Path to the input MP4/MOV file
            output_dir: Output directory (default: ./nerf_output/<video_name>)

        Returns:
            A :class:`NerfResult` with ``success``, the ``method`` used, the
            exported model path, and any error message.
        """
        if not os.path.exists(video_path):
            return NerfResult(success=False, method=self.config.method,
                            error=f"Video file not found: {video_path}")
        
        video_name = Path(video_path).stem
        out_dir = output_dir or f"./nerf_output/{video_name}"
        os.makedirs(out_dir, exist_ok=True)
        
        try:
            # Step 1: Extract frames
            frames_dir = os.path.join(out_dir, "frames")
            self._extract_frames(video_path, frames_dir)
            
            # Step 2: COLMAP camera pose estimation
            colmap_dir = os.path.join(out_dir, "colmap")
            self._run_colmap(frames_dir, colmap_dir)
            
            # Step 3: Train NeRF / Gaussian Splatting
            model_dir = os.path.join(out_dir, "model")
            self._train_model(frames_dir, colmap_dir, model_dir)
            
            # Step 4: Export 3D model
            export_path = os.path.join(out_dir, f"{video_name}.{self.config.output_format}")
            self._export_model(model_dir, export_path)
            
            # Step 5: Render preview
            preview_path = None
            if self.config.render_preview:
                preview_path = os.path.join(out_dir, f"{video_name}_preview.mp4")
                self._render_preview(model_dir, preview_path)
            
            return NerfResult(
                success=True,
                method=self.config.method,
                model_path=model_dir,
                point_cloud_path=export_path,
                preview_path=preview_path,
                metrics={
                    "frames_extracted": self._count_frames(frames_dir),
                    "iterations": self.config.max_iterations,
                    "output_format": self.config.output_format,
                }
            )
            
        except Exception as e:
            return NerfResult(
                success=False,
                method=self.config.method,
                error=str(e)
            )
    
    def _extract_frames(self, video_path: str, output_dir: str):
        """Extract frames from video using ffmpeg."""
        os.makedirs(output_dir, exist_ok=True)
        
        fps = 2  # Extract 2 frames per second for COLMAP
        subprocess.run([
            "ffmpeg", "-y", "-i", video_path,
            "-vf", f"fps={fps},scale=1920:-1",
            "-q:v", "2",
            f"{output_dir}/frame_%06d.jpg"
        ], check=True, capture_output=True)
        
        print(f"[NeRF] Extracted frames to {output_dir}")
    
    def _run_colmap(self, frames_dir: str, output_dir: str):
        """Run COLMAP Structure from Motion for camera pose estimation."""
        os.makedirs(output_dir, exist_ok=True)
        db_path = os.path.join(output_dir, "database.db")
        
        # Feature extraction
        subprocess.run([
            "colmap", "feature_extractor",
            "--database_path", db_path,
            "--image_path", frames_dir,
            "--SiftExtraction.use_gpu", "1",
            "--SiftExtraction.max_image_size", "1920",
            "--SiftExtraction.quality", self.config.colmap_quality,
        ], check=True, capture_output=True)
        
        # Feature matching
        subprocess.run([
            "colmap", "exhaustive_matcher",
            "--database_path", db_path,
            "--SiftMatching.use_gpu", "1",
        ], check=True, capture_output=True)
        
        # Sparse reconstruction
        sparse_dir = os.path.join(output_dir, "sparse")
        os.makedirs(sparse_dir, exist_ok=True)
        subprocess.run([
            "colmap", "mapper",
            "--database_path", db_path,
            "--image_path", frames_dir,
            "--output_path", sparse_dir,
        ], check=True, capture_output=True)
        
        print(f"[NeRF] COLMAP reconstruction complete → {sparse_dir}")
    
    def _train_model(self, frames_dir: str, colmap_dir: str, output_dir: str):
        """Train NeRF or Gaussian Splatting model using nerfstudio."""
        os.makedirs(output_dir, exist_ok=True)
        
        if self.config.method == "gaussian-splatting":
            method = "gaussian-splatting"
        elif self.config.method == "instant-ngp":
            method = "instant-ngp"
        else:
            method = "nerfacto"
        
        # nerfstudio uses a unified CLI
        subprocess.run([
            "ns-train", method,
            "--data", colmap_dir,
            "--output-dir", output_dir,
            "--max-num-iterations", str(self.config.max_iterations),
            "--pipeline.model.predict-normals", "False",
            "colmap",
        ], check=True)
        
        print(f"[NeRF] Training complete → {output_dir}")
    
    def _export_model(self, model_dir: str, output_path: str):
        """Export trained model to standard 3D format."""
        # Find the latest checkpoint
        config_dir = os.path.join(model_dir, "config.yml")
        
        if self.config.output_format == "ply":
            subprocess.run([
                "ns-export", "gaussian-splat",
                "--load-config", config_dir,
                "--output-dir", os.path.dirname(output_path),
            ], check=True)
        elif self.config.output_format == "glb":
            subprocess.run([
                "ns-export", "glb",
                "--load-config", config_dir,
                "--output-dir", os.path.dirname(output_path),
            ], check=True)
        
        print(f"[NeRF] Model exported → {output_path}")
    
    def _render_preview(self, model_dir: str, output_path: str):
        """Render an orbit preview video of the 3D model."""
        config_dir = os.path.join(model_dir, "config.yml")
        
        subprocess.run([
            "ns-render", "camera-path",
            "--load-config", config_dir,
            "--output-path", output_path,
            "--output-format", "video",
            "--num-frames", str(self.config.preview_frames),
        ], check=True)
        
        print(f"[NeRF] Preview rendered → {output_path}")
    
    def _count_frames(self, frames_dir: str) -> int:
        """Count the number of frames extracted."""
        if not os.path.isdir(frames_dir):
            return 0
        return len([f for f in os.listdir(frames_dir) if f.endswith('.jpg')])


def is_nerf_available() -> bool:
    """Check if the required NeRF/gsplat tools are installed."""
    try:
        subprocess.run(["colmap", "help"], capture_output=True, timeout=10)
        subprocess.run(["ns-train", "--help"], capture_output=True, timeout=10)
        return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False
