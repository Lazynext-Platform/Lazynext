"""
Demucs stem separation pipeline.

Provides an end-to-end pipeline for audio source separation using the
Demucs API, decomposing audio into stems such as vocals, drums, bass,
and other instruments. Supports native Demucs models including htdemucs.
"""

import os
from dataclasses import dataclass, field
from typing import Optional, List
import importlib.util

@dataclass
class DemucsConfig:
    """Configuration for Demucs stem separation."""
    model_name: str = "htdemucs"
    stems: int = 4 # Options: 2 (vocals/accomp), 4, 6
    output_format: str = "wav" # "wav" or "flac"
    device: str = "auto" # "auto", "cuda", "cpu", "mps"


def _resolve_device(preferred: str) -> str:
    """Resolve a usable torch device, falling back when the preferred one is
    unavailable (so a default of 'cuda' does not crash CPU-only hosts)."""
    try:
        import torch
    except Exception:
        return "cpu"

    def cuda_ok() -> bool:
        try:
            return torch.cuda.is_available()
        except Exception:
            return False

    def mps_ok() -> bool:
        backend = getattr(torch.backends, "mps", None)
        try:
            return bool(backend) and backend.is_available()
        except Exception:
            return False

    if preferred == "cuda" and cuda_ok():
        return "cuda"
    if preferred == "mps" and mps_ok():
        return "mps"
    if preferred == "cpu":
        return "cpu"
    # "auto" (or an unavailable explicit choice) → best available device.
    if cuda_ok():
        return "cuda"
    if mps_ok():
        return "mps"
    return "cpu"


@dataclass
class DemucsResult:
    """Result of a Demucs extraction job."""
    success: bool
    method: str
    output_dir: Optional[str] = None
    stems_generated: List[str] = field(default_factory=list)
    error: Optional[str] = None

class DemucsPipeline:
    """
    End-to-end Demucs stem separation pipeline using demucs API natively.
    """
    
    def __init__(self, config: Optional[DemucsConfig] = None):
        self.config = config or DemucsConfig()
        self.is_available = importlib.util.find_spec("demucs") is not None

    def separate(self, audio_path: str, output_dir: Optional[str] = None) -> DemucsResult:
        """
        Separate audio into stems.
        
        Args:
            audio_path: Path to the input audio file
            output_dir: Output directory for stems

        Returns:
            A :class:`DemucsResult` with ``success``, the ``method`` used,
            the separated stem file paths, and any error message.
        """
        if not os.path.exists(audio_path):
            return DemucsResult(success=False, method="demucs", error=f"Audio file not found: {audio_path}")
            
        if not self.is_available:
            return DemucsResult(success=False, method="demucs", error="demucs python package is not installed.")
            
        out_dir = output_dir or f"./demucs_output/{os.path.basename(audio_path)}"
        os.makedirs(out_dir, exist_ok=True)
        
        try:
            print(f"[Demucs] Starting separation for {audio_path} using model {self.config.model_name}")
            import time
            start_time = time.perf_counter()

            # Use native Demucs API instead of subprocess
            from demucs.api import Separator

            device = _resolve_device(self.config.device)
            print(f"[Demucs] Using device: {device}")

            separator = Separator(model=self.config.model_name, device=device)

            # Load and separate. The separator returns a dict mapping track
            # names (e.g. 'vocals', 'drums') to PyTorch tensors.
            _, separated = separator.separate_audio_file(audio_path)

            # Two-stem mode: keep 'vocals' and sum the remaining stems into a
            # single 'accompaniment' track.
            if self.config.stems <= 2 and "vocals" in separated:
                accompaniment = None
                for name, tensor in separated.items():
                    if name == "vocals":
                        continue
                    accompaniment = tensor if accompaniment is None else accompaniment + tensor
                reduced = {"vocals": separated["vocals"]}
                if accompaniment is not None:
                    reduced["accompaniment"] = accompaniment
                separated = reduced

            import torchaudio
            stems_generated = []

            for stem_name, stem_tensor in separated.items():
                output_path = os.path.join(out_dir, f"{stem_name}.{self.config.output_format}")
                torchaudio.save(output_path, stem_tensor.cpu(), sample_rate=separator.samplerate)
                stems_generated.append(output_path)

            print(f"[Demucs] Separated {len(stems_generated)} stems in {time.perf_counter() - start_time:.2f}s")

            return DemucsResult(
                success=True,
                method="demucs_native",
                output_dir=out_dir,
                stems_generated=stems_generated
            )

        except Exception as e:
            return DemucsResult(
                success=False,
                method="demucs_native",
                error=f"Separation failed: {e}"
            )
