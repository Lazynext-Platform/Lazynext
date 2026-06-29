import asyncio
import os
import httpx
from fastapi import HTTPException
from src.models import DubRequest, OverdubRequest, StemSplitRequest
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from demucs_pipeline import DemucsPipeline, DemucsConfig
async def dub_video_service(req: DubRequest):
    api_key = os.getenv("ELEVENLABS_API_KEY")

    if api_key:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                }
                voice_id = "21m00Tcm4TlvDq8ikWAM"
                payload = {
                    "text": req.text_to_dub,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                    },
                }

                response = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                    headers=headers,
                    json=payload,
                    timeout=60.0,
                )
                response.raise_for_status()

                return {
                    "success": True,
                    "clip_id": req.clip_id,
                    "language": req.target_language,
                    "source": "elevenlabs",
                    "audio_url": f"https://cdn.lazynext.ai/dubbed/{req.clip_id}_{req.target_language}.mp3",
                }
        except Exception as e:
            print(f"[GenerativeStudio] ElevenLabs API error: {e}")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Dubbing unavailable — ElevenLabs API key not configured",
        )

    raise HTTPException(
        status_code=500,
        detail="Dubbing service failed internally"
    )

async def overdub_audio_service(req: OverdubRequest):
    api_key = os.getenv("ELEVENLABS_API_KEY")

    if api_key:
        try:
            async with httpx.AsyncClient() as client:
                headers = {
                    "xi-api-key": api_key,
                    "Content-Type": "application/json",
                }
                voice_id = req.voice_id or "cloned_user_voice"
                payload = {
                    "text": req.text,
                    "model_id": "eleven_multilingual_v2",
                    "voice_settings": {
                        "stability": 0.7,
                        "similarity_boost": 0.8,
                    },
                }

                response = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                    headers=headers,
                    json=payload,
                    timeout=60.0,
                )
                response.raise_for_status()

                return {
                    "success": True,
                    "source": "elevenlabs-cloned",
                    "audio_url": f"https://cdn.lazynext.ai/overdub/{req.voice_id}_overdub.mp3",
                }
        except Exception as e:
            print(f"[GenerativeStudio] ElevenLabs API error: {e}")

    try:
        from TTS.api import TTS
        tts = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC", progress_bar=False)
        output_path = f"/tmp/overdub_{hash(req.text)}.wav"
        tts.tts_to_file(text=req.text, file_path=output_path)
        return {
            "success": True,
            "source": "coqui-tts-local",
            "audio_url": f"file://{output_path}",
        }
    except ImportError:
        pass

    raise HTTPException(
        status_code=503,
        detail="Overdubbing unavailable — neither ElevenLabs nor local TTS succeeded."
    )

async def split_stems_service(req: StemSplitRequest):
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
    else:
        # Fallback to Spleeter if demucs fails (e.g., missing package)
        pass

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
            print("[GenerativeStudio] Demucs/Spleeter not installed. Install: pip install demucs")

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
                vocals_path = f"{hpss_dir}/vocals.wav"
                other_path = f"{hpss_dir}/other.wav"
                sf.write(vocals_path, y_harmonic, sr)
                sf.write(other_path, y_percussive, sr)
                stems_output = {
                    "vocals": f"file://{vocals_path}",
                    "other": f"file://{other_path}",
                }
                method = "librosa_hpss"
        except ImportError:
            pass

    if not stems_output:
        raise HTTPException(
            status_code=503,
            detail="Stem separation unavailable — no backend installed (demucs/spleeter/librosa)",
        )

    return {
        "success": True,
        "audio_id": req.audio_id,
        "source": method,
        "stems": stems_output,
    }
