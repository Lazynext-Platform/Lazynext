"""
Audio generation services: dubbing via Edge TTS, voice-cloned overdubbing via F5-TTS, and stem separation.

Uses Edge TTS (Microsoft) for standard dubbing — free, unlimited, 300+ voices across 100+ languages.
F5-TTS for zero-shot voice cloning — MIT licensed, 300M params, CPU-capable (~1-2 min).
"""

import asyncio
import os
import sys
import httpx
from fastapi import HTTPException
from src.models import DubRequest, OverdubRequest, StemSplitRequest
from src.services.pathsafe import BASE_TMP_DIR, safe_slug, safe_tmp_path

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from demucs_pipeline import DemucsPipeline, DemucsConfig


def _safe_slug(value: str, fallback: str = "output") -> str:
    """Backwards-compatible alias for :func:`src.services.pathsafe.safe_slug`."""
    return safe_slug(value, fallback)


async def _edge_tts(text: str, language: str = "en-US") -> bytes:
    """Generate speech using Microsoft Edge TTS — free, unlimited, 300+ voices.

    Uses the edge-tts library. No API key required.
    """
    try:
        import edge_tts
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Edge TTS not installed. Run: pip install edge-tts",
        )

    language_map = {
        "en": "en-US", "hi": "hi-IN", "es": "es-ES", "fr": "fr-FR",
        "de": "de-DE", "ja": "ja-JP", "ko": "ko-KR", "pt": "pt-BR",
        "zh": "zh-CN", "ar": "ar-SA", "ru": "ru-RU",
    }
    lang_code = language_map.get(language, "en-US")
    voice = os.getenv("EDGE_TTS_VOICE", f"{lang_code}-AvaNeural")

    try:
        communicate = edge_tts.Communicate(text, voice)
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        if not audio_data:
            raise HTTPException(status_code=500, detail="Edge TTS returned empty audio")
        return audio_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Edge TTS synthesis failed: {e}")


async def dub_video_service(req: DubRequest):
    """Generate AI-dubbed speech using Microsoft Edge TTS."""
    try:
        audio_bytes = await _edge_tts(req.text_to_dub, req.target_language)
        safe_clip = _safe_slug(req.clip_id, "clip")
        safe_lang = _safe_slug(req.target_language, "lang")
        output_path = safe_tmp_path(f"dubbed_{safe_clip}_{safe_lang}.mp3")
        with open(output_path, "wb") as audio_file:
            audio_file.write(audio_bytes)
        return {
            "success": True,
            "clip_id": req.clip_id,
            "language": req.target_language,
            "source": "edge-tts",
            "audio_url": f"file://{output_path}",
            "bytes": len(audio_bytes),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[GenerativeStudio] Edge TTS error: {e}")
    raise HTTPException(
        status_code=503,
        detail="Dubbing unavailable — install edge-tts: pip install edge-tts",
    )


async def overdub_audio_service(req: OverdubRequest):
    """Generate voice-cloned overdub audio using F5-TTS.

    F5-TTS provides zero-shot voice cloning from reference audio.
    """
    # Local F5-TTS (works on CPU)
    ref_audio = os.path.join(BASE_TMP_DIR, "speaker_reference.wav")
    ref_text = req.voice_id or ""

    if req.original_audio_url and req.original_audio_url.startswith("file://"):
        # Confine the user-supplied reference to the trusted tmp directory —
        # only its basename is honoured, never an absolute/traversal path.
        requested = req.original_audio_url.replace("file://", "")
        ref_audio = safe_tmp_path(os.path.basename(requested), "speaker_reference.wav")

    if not os.path.exists(ref_audio):
        for candidate in ["speaker_reference.wav", "ref_edge.wav",
            "edge_tts_long.mp3", "edge_tts_test.mp3"]:
            candidate_path = os.path.join(BASE_TMP_DIR, candidate)
            if os.path.exists(candidate_path):
                ref_audio = candidate_path
                break

    # Auto-generate reference with Edge TTS if none exists
    if not os.path.exists(ref_audio):
        try:
            print("[GenerativeStudio] Generating reference audio via Edge TTS...")
            ref_bytes = await _edge_tts(
                "Hello, this is a reference voice for cloning. The quick brown fox jumps over the lazy dog.",
                "en-US"
            )
            with open(ref_audio, "wb") as f:
                f.write(ref_bytes)
            ref_text = ref_text or "Hello, this is a reference voice for cloning."
        except Exception as e:
            print(f"[GenerativeStudio] Failed to generate reference: {e}")

    if not os.path.exists(ref_audio):
        raise HTTPException(
            status_code=503,
            detail="No reference audio found. Provide original_audio_url or place speaker_reference.wav in /tmp/.",
        )

    output_path = safe_tmp_path(f"overdub_{hash(req.text)}.wav")

    try:
        import subprocess
        cmd = [
            "f5-tts_infer-cli",
            "--model", "F5TTS_v1_Base",
            "--vocoder_name", "vocos",
            "--ref_audio", ref_audio,
            "--ref_text", ref_text or "Hello, this is a reference voice.",
            "--gen_text", req.text,
            "--output_dir", BASE_TMP_DIR,
            "--output_file", os.path.basename(output_path),
            "--remove_silence",
            "--device", "cpu",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            raise HTTPException(status_code=503, detail=f"F5-TTS failed: {result.stderr[-200:]}")
        if not os.path.exists(output_path):
            raise HTTPException(status_code=503, detail="F5-TTS completed but no output file")
        return {
            "success": True,
            "source": "f5-tts",
            "audio_url": f"file://{output_path}",
            "bytes": os.path.getsize(output_path),
        }
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="F5-TTS not installed. Run: pip install f5-tts")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Voice cloning failed: {e}")


async def split_stems_service(req: StemSplitRequest):
    """Separate audio into vocal/instrumental stems using Demucs, Spleeter, or librosa."""
    safe_audio_id = safe_slug(req.audio_id, "audio")
    audio_path = safe_tmp_path(f"{safe_audio_id}.wav")
    stems_output = {}
    method = None

    config = DemucsConfig(stems=req.stems)
    pipeline = DemucsPipeline(config)
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, pipeline.separate, audio_path)

    if result.success:
        for stem_path in result.stems_generated:
            stem_name = os.path.basename(stem_path).split(".")[0]
            stems_output[stem_name] = f"file://{stem_path}"
        method = result.method

    if not stems_output:
        try:
            from spleeter.separator import Separator
            separator = Separator('spleeter:{}stems'.format(min(req.stems, 5)))
            out_dir = safe_tmp_path(f"spleeter_{safe_audio_id}")
            separator.separate_to_file(audio_path, out_dir)
            import glob
            for stem_file in glob.glob(f"{out_dir}/**/*.wav", recursive=True):
                stem_name = os.path.basename(stem_file).replace(".wav", "")
                stems_output[stem_name] = f"file://{stem_file}"
            if stems_output:
                method = "spleeter"
        except ImportError:
            pass

    if not stems_output:
        try:
            import soundfile as sf
            import librosa
            if os.path.exists(audio_path):
                y, sr = librosa.load(audio_path, sr=44100)
                y_harmonic, y_percussive = librosa.effects.hpss(y)
                hpss_dir = safe_tmp_path(f"hpss_{safe_audio_id}")
                os.makedirs(hpss_dir, exist_ok=True)
                sf.write(f"{hpss_dir}/vocals.wav", y_harmonic, sr)
                sf.write(f"{hpss_dir}/other.wav", y_percussive, sr)
                stems_output = {"vocals": f"file://{hpss_dir}/vocals.wav", "other": f"file://{hpss_dir}/other.wav"}
                method = "librosa_hpss"
        except ImportError:
            pass

    if not stems_output:
        raise HTTPException(status_code=503, detail="Stem separation unavailable")
    return {"success": True, "audio_id": req.audio_id, "source": method, "stems": stems_output}
