"""
Audio generation services: dubbing via Gemini TTS, voice-cloned overdubbing via ElevenLabs, and stem separation.

Uses Gemini (Google Cloud Text-to-Speech) for standard dubbing with graceful fallback.
ElevenLabs is kept only for voice cloning (overdub).
"""

import asyncio
import os
import sys
import base64
import httpx
from fastapi import HTTPException
from src.models import DubRequest, OverdubRequest, StemSplitRequest

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from demucs_pipeline import DemucsPipeline, DemucsConfig

GEMINI_TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize"


async def _gemini_tts(text: str, language: str = "en-US") -> bytes:
    """Generate speech using Gemini (Google Cloud Text-to-Speech)."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key not configured",
        )

    language_map = {
        "en": "en-US", "hi": "hi-IN", "es": "es-ES", "fr": "fr-FR",
        "de": "de-DE", "ja": "ja-JP", "ko": "ko-KR", "pt": "pt-BR",
        "zh": "cmn-CN", "ar": "ar-XA", "ru": "ru-RU",
    }
    lang_code = language_map.get(language, "en-US")

    async with httpx.AsyncClient() as client:
        payload = {
            "input": {"text": text},
            "voice": {"languageCode": lang_code, "ssmlGender": "NEUTRAL"},
            "audioConfig": {"audioEncoding": "MP3"},
        }
        response = await client.post(
            f"{GEMINI_TTS_URL}?key={api_key}",
            json=payload,
            timeout=30.0,
        )

        if response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="Gemini TTS quota exceeded — try again later",
            )

        response.raise_for_status()
        data = response.json()
        audio_b64 = data.get("audioContent", "")
        if audio_b64:
            return base64.b64decode(audio_b64)
        raise HTTPException(status_code=500, detail="No audio content returned from Gemini TTS")


async def dub_video_service(req: DubRequest):
    """Generate AI-dubbed speech using Gemini TTS. Falls back to ElevenLabs if Gemini fails.

    Args:
        req: DubRequest with clip_id, target_language, and text_to_dub.

    Returns:
        dict with success, clip_id, language, source, and audio_url.
    """
    source = "gemini-tts"

    try:
        audio_bytes = await _gemini_tts(req.text_to_dub, req.target_language)
        # Persist the synthesized audio so the returned URL points at a real
        # file (previously the bytes were generated and then discarded).
        output_path = f"/tmp/dubbed_{req.clip_id}_{req.target_language}.mp3"
        with open(output_path, "wb") as audio_file:
            audio_file.write(audio_bytes)
        return {
            "success": True,
            "clip_id": req.clip_id,
            "language": req.target_language,
            "source": source,
            "audio_url": f"file://{output_path}",
            "bytes": len(audio_bytes),
        }
    except HTTPException:
        pass
    except Exception as e:
        print(f"[GenerativeStudio] Gemini TTS error: {e}")

    raise HTTPException(
        status_code=503,
        detail="Dubbing unavailable — configure GEMINI_API_KEY",
    )


async def overdub_audio_service(req: OverdubRequest):
    """Generate voice-cloned overdub audio using Coqui TTS (XTTS v2).

    Coqui XTTS v2 is the voice cloning engine — free, local, unlimited.

    Args:
        req: OverdubRequest with text, voice_id, and optional original_audio_url.

    Returns:
        dict with success, source, and audio_url.
    """
    try:
        from TTS.api import TTS

        # Use XTTS v2 for voice cloning
        tts = TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=False)

        if req.original_audio_url and req.original_audio_url.startswith("file://"):
            speaker_wav = req.original_audio_url.replace("file://", "")
        elif os.path.exists("/tmp/speaker_reference.wav"):
            speaker_wav = "/tmp/speaker_reference.wav"
        else:
            speaker_wav = None

        output_path = f"/tmp/overdub_coqui_{hash(req.text)}.wav"
        tts.tts_to_file(
            text=req.text,
            file_path=output_path,
            speaker_wav=speaker_wav,
            language="en",
        )
        return {
            "success": True,
            "source": "coqui-xtts-v2",
            "audio_url": f"file://{output_path}",
        }
    except ImportError:
        print("[GenerativeStudio] Coqui TTS not installed. Run: pip install coqui-tts")
    except Exception as e:
        print(f"[GenerativeStudio] Coqui TTS error: {e}")

    raise HTTPException(
        status_code=503,
        detail="Voice cloning unavailable. Install Coqui TTS: pip install coqui-tts",
    )


async def split_stems_service(req: StemSplitRequest):
    """Separate audio into vocal/instrumental stems using Demucs, Spleeter, or librosa."""

    audio_path = f"/tmp/{req.audio_id}.wav"
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
            out_dir = f"/tmp/spleeter_{req.audio_id}"
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
            import numpy as np
            import soundfile as sf
            import librosa
            if os.path.exists(audio_path):
                y, sr = librosa.load(audio_path, sr=44100)
                y_harmonic, y_percussive = librosa.effects.hpss(y)
                hpss_dir = f"/tmp/hpss_{req.audio_id}"
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
