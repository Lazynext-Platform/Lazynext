"""
Audio analysis services: transcription and enhancement.

Uses OpenAI Whisper for speech-to-text and a local SciPy DSP pipeline
for noise reduction, compression, and EQ enhancement.
"""

import asyncio
import os
import httpx
from fastapi import HTTPException
from src.models import VideoRequest, EnhanceAudioRequest

async def transcribe_audio_service(req: VideoRequest):
    """Transcribe speech to word-level subtitles using OpenAI Whisper.

    Args:
        req: VideoRequest containing the video_id to transcribe.

    Returns:
        dict with success, video_id, language, and word-level subtitles.

    Raises:
        HTTPException: 503 if API key is missing, 404 if audio file missing, 500 on failure.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    file_path = f"/tmp/{req.video_id}.mp4"

    if api_key and os.path.exists(file_path):
        try:
            async with httpx.AsyncClient() as client:
                with open(file_path, "rb") as audio_file:
                    files = {
                        "file": (file_path, audio_file, "audio/mp4"),
                        "model": (None, "whisper-1"),
                        "response_format": (None, "verbose_json"),
                        "timestamp_granularities[]": (None, "word"),
                    }
                    headers = {"Authorization": f"Bearer {api_key}"}

                    response = await client.post(
                        "https://api.openai.com/v1/audio/transcriptions",
                        files=files,
                        headers=headers,
                        timeout=120.0,
                    )
                    response.raise_for_status()
                    data = response.json()

                    subtitles = []
                    if "words" in data:
                        for w in data["words"]:
                            subtitles.append(
                                {
                                    "start": w["start"],
                                    "end": w["end"],
                                    "text": w["word"],
                                }
                            )

                    return {
                        "success": True,
                        "video_id": req.video_id,
                        "language": data.get("language"),
                        "subtitles": subtitles,
                    }
        except Exception as e:
            print(f"[Pre-Processing] Whisper API error: {e}")

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="Transcription service unavailable — Whisper API key not configured"
        )
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail=f"Video file not found at {file_path}"
        )
    
    raise HTTPException(
        status_code=500,
        detail="Transcription service failed internally"
    )
async def enhance_audio_service(req: EnhanceAudioRequest):
    """Enhance audio quality using a DSP pipeline (high-pass, gate, compressor, EQ).

    Supports `studio_podcast` and `vocal_boost` target profiles using SciPy filters.
    Produces an enhanced WAV file and returns its URL.

    Args:
        req: EnhanceAudioRequest with video_id and target_profile.

    Returns:
        dict with success, video_id, enhanced_audio_url, profile_applied, and method.

    Raises:
        HTTPException: 503 if DSP dependencies are missing, 500 on processing error.
    """
    audio_path = f"/tmp/{req.video_id}.wav"
    output_path = f"/tmp/{req.video_id}_enhanced.wav"
    method = None

    try:
        import numpy as np
        import soundfile as sf
        from scipy import signal

        if os.path.exists(audio_path):
            samples, sr = sf.read(audio_path)
            is_stereo = len(samples.shape) > 1

            if is_stereo:
                channels = [samples[:, 0], samples[:, 1]]
            else:
                channels = [samples]

            processed_channels = []
            for ch in channels:
                sos = signal.butter(4, 80, 'hp', fs=sr, output='sos')
                ch = signal.sosfilt(sos, ch)

                gate_threshold = 10.0 ** (-50.0 / 20.0)
                ch[np.abs(ch) < gate_threshold] = 0.0

                threshold = -20.0
                ratio = 4.0
                knee = 6.0
                makeup_gain = 10.0 ** (6.0 / 20.0)

                threshold_linear = 10.0 ** (threshold / 20.0)
                knee_half = knee / 2.0

                for i in range(len(ch)):
                    abs_val = abs(ch[i])
                    if abs_val < 1e-10:
                        continue
                    db_val = 20.0 * np.log10(abs_val)
                    if db_val < (threshold - knee_half):
                        ch[i] *= 1.0
                    elif db_val > (threshold + knee_half):
                        gain_reduction = threshold + (db_val - threshold) / ratio
                        gain = 10.0 ** ((gain_reduction - db_val) / 20.0)
                        ch[i] *= gain
                    else:
                        excess = db_val - threshold + knee_half
                        gain_reduction = threshold + (excess ** 2) / (2.0 * knee)
                        gain = 10.0 ** ((gain_reduction - db_val) / 20.0)
                        ch[i] *= gain

                ch *= makeup_gain

                if req.target_profile == "studio_podcast":
                    sos_eq = signal.butter(2, [80, 15000], 'band', fs=sr, output='sos')
                    ch = signal.sosfilt(sos_eq, ch)
                    b_peak, a_peak = signal.iirpeak(3000, Q=1.0, fs=sr)
                    ch += signal.lfilter(b_peak, a_peak, ch) * 0.3
                elif req.target_profile == "vocal_boost":
                    b_peak, a_peak = signal.iirpeak(2500, Q=0.7, fs=sr)
                    ch += signal.lfilter(b_peak, a_peak, ch) * 0.5

                max_val = np.max(np.abs(ch))
                if max_val > 0.95:
                    ch = ch / max_val * 0.95

                processed_channels.append(ch)

            if is_stereo:
                result = np.column_stack(processed_channels)
            else:
                result = processed_channels[0]

            sf.write(output_path, result, sr)
            method = "dsp_pipeline+{}".format(req.target_profile)

        if not method:
            raise HTTPException(
                status_code=500,
                detail="Audio enhancement failed internally."
            )
            
    except ImportError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Audio enhancement DSP not available (missing dependencies): {e}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Audio enhancement error: {e}"
        )

    return {
        "success": True,
        "video_id": req.video_id,
        "enhanced_audio_url": f"file://{output_path}" if os.path.exists(output_path) else None,
        "profile_applied": req.target_profile,
        "method": method,
    }
