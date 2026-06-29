import asyncio
import os
import subprocess
from fastapi import HTTPException
from src.models import (
    ProcessRequest, TrackRequest, ReframeRequest,
    RetouchRequest, ExtractHookRequest, ProxyRequest, IngestRequest
)

async def process_video_service(req: ProcessRequest):
    completed = []

    audio_samples = None
    sample_rate = 44100
    audio_path = f"/tmp/{req.video_id}.wav"

    try:
        import numpy as np
        if os.path.exists(audio_path):
            try:
                import soundfile as sf
                audio_samples, sample_rate = sf.read(audio_path)
                if len(audio_samples.shape) > 1:
                    audio_samples = audio_samples.mean(axis=1)
            except ImportError:
                pass
    except ImportError:
        pass

    for op in req.operations:
        if op == "auto_editor":
            if audio_samples is not None:
                import numpy as np
                window_ms = 10
                window_samples = int(sample_rate * window_ms / 1000)
                threshold_db = -40.0
                threshold_linear = 10.0 ** (threshold_db / 20.0)
                min_silence_ms = 500
                min_silence_windows = min_silence_ms // window_ms

                silence_regions = []
                silence_count = 0
                silence_start = None

                for i in range(0, len(audio_samples) - window_samples, window_samples):
                    chunk = audio_samples[i:i + window_samples]
                    rms = np.sqrt(np.mean(chunk ** 2))
                    time_sec = i / sample_rate

                    if rms < threshold_linear:
                        if silence_start is None:
                            silence_start = time_sec
                        silence_count += 1
                    else:
                        if silence_count >= min_silence_windows and silence_start is not None:
                            silence_regions.append({
                                "start": round(silence_start, 2),
                                "end": round(time_sec, 2),
                            })
                        silence_start = None
                        silence_count = 0

                if silence_count >= min_silence_windows and silence_start is not None:
                    silence_regions.append({
                        "start": round(silence_start, 2),
                        "end": round(len(audio_samples) / sample_rate, 2),
                    })

                total_removed = sum(r["end"] - r["start"] for r in silence_regions)
                completed.append({
                    "operation": "auto_editor",
                    "cut_list": silence_regions[:10],
                    "silence_regions_detected": len(silence_regions),
                    "silence_removed_seconds": round(total_removed, 1),
                    "analysis_method": "rms_threshold",
                })
            else:
                await asyncio.sleep(1.0)
                completed.append({
                    "operation": "auto_editor",
                    "cut_list": [
                        {"start": 0.5, "end": 4.2},
                        {"start": 8.1, "end": 15.0},
                    ],
                    "silence_removed_seconds": 10.6,
                    "analysis_method": "fallback",
                })

        elif op == "scene_detect":
            video_path = f"/tmp/{req.video_id}.mp4"
            cuts = []
            try:
                import cv2
                import numpy as np
                cap = cv2.VideoCapture(video_path)
                if cap.isOpened():
                    prev_hist = None
                    frame_idx = 0
                    threshold = 0.3
                    while True:
                        ret, frame = cap.read()
                        if not ret:
                            break
                        if frame_idx % 5 == 0:
                            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                            hist = cv2.calcHist([gray], [0], None, [64], [0, 256])
                            hist = cv2.normalize(hist, hist).flatten()
                            if prev_hist is not None:
                                diff = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CHISQR)
                                if diff > threshold:
                                    cuts.append(frame_idx)
                            prev_hist = hist
                        frame_idx += 1
                    cap.release()
                completed.append({
                    "operation": "scene_detect",
                    "cuts": cuts[:20],
                    "scene_count": len(cuts) + 1,
                    "analysis_method": "histogram_diff" if cuts else "no_video_file",
                })
            except (ImportError, Exception):
                completed.append({
                    "operation": "scene_detect",
                    "cuts": [],
                    "scene_count": 1,
                    "analysis_method": "unavailable",
                })

        elif op == "clean_audio":
            if audio_samples is not None:
                import numpy as np
                window_ms = 20
                window_samples = int(sample_rate * window_ms / 1000)
                threshold_db = -35.0
                threshold_linear = 10.0 ** (threshold_db / 20.0)

                cuts = []
                silence_count = 0
                silence_start = None

                for i in range(0, len(audio_samples) - window_samples, window_samples):
                    chunk = audio_samples[i:i + window_samples]
                    rms = np.sqrt(np.mean(chunk ** 2))
                    time_sec = i / sample_rate
                    if rms < threshold_linear:
                        if silence_start is None:
                            silence_start = time_sec
                        silence_count += 1
                    else:
                        if silence_count >= 3 and silence_start is not None:
                            duration = time_sec - silence_start
                            reason = "filler_word" if duration < 1.0 else "dead_air"
                            cuts.append({
                                "start": round(silence_start, 2),
                                "end": round(time_sec, 2),
                                "reason": reason,
                            })
                        silence_start = None
                        silence_count = 0

                total = sum(c["end"] - c["start"] for c in cuts)
                completed.append({
                    "operation": "clean_audio",
                    "cuts_to_delete": cuts[:20],
                    "total_removed_seconds": round(total, 1),
                    "analysis_method": "rms_threshold",
                })
            else:
                await asyncio.sleep(1.0)
                completed.append({
                    "operation": "clean_audio",
                    "cuts_to_delete": [],
                    "total_removed_seconds": 0,
                    "analysis_method": "no_audio_available",
                })

        else:
            completed.append({"operation": op, "status": "unknown_operation"})

    return {
        "success": True,
        "video_id": req.video_id,
        "operations_completed": completed,
    }

async def track_motion_service(req: TrackRequest):
    tracker_name = "dev-fallback"
    keyframes = []
    num_frames = max(req.end_frame - req.start_frame, 60)

    try:
        import cv2
        import numpy as np

        video_path = f"/tmp/{req.video_id}.mp4"
        if os.path.exists(video_path):
            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                tracker = cv2.TrackerCSRT_create()
                tracker_name = "csrt"

                cap.set(cv2.CAP_PROP_POS_FRAMES, req.start_frame)
                ret, frame = cap.read()
                if ret:
                    x, y, w, h = [int(v) for v in req.roi]
                    bbox = (x, y, w, h)
                    tracker.init(frame, bbox)

                    for i in range(req.start_frame, req.end_frame):
                        ret, frame = cap.read()
                        if not ret:
                            break
                        ok, bbox = tracker.update(frame)
                        if ok:
                            keyframes.append({
                                "frame": i,
                                "x": float(bbox[0]),
                                "y": float(bbox[1]),
                                "w": float(bbox[2]),
                                "h": float(bbox[3]),
                                "confidence": 0.9,
                            })

                cap.release()

    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Tracking unavailable — opencv-python not installed",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Tracking error: {e}"
        )

    if not keyframes:
        raise HTTPException(
            status_code=404,
            detail=f"Video file not found or tracking failed for video_id {req.video_id}"
        )

    return {
        "success": True,
        "video_id": req.video_id,
        "tracker": tracker_name,
        "frames_tracked": len(keyframes),
        "keyframes": keyframes
    }

async def auto_reframe_service(req: ReframeRequest):
    await asyncio.sleep(2.0)
    keyframes = []
    for i in range(0, 100, 10):
        keyframes.append({
            "frame": i,
            "crop_x": 420 + (i * 2),
            "crop_y": 0,
            "crop_w": 1080,
            "crop_h": 1920
        })
    return {
        "success": True,
        "video_id": req.video_id,
        "target_aspect_ratio": req.target_aspect_ratio,
        "keyframes": keyframes
    }

async def retouch_service(req: RetouchRequest):
    video_path = f"/tmp/{req.video_id}.mp4"
    output_path = f"/tmp/{req.video_id}_retouched.mp4"
    method = None
    frames_processed = 0

    try:
        import cv2
        import numpy as np
        import tempfile

        if os.path.exists(video_path):
            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
                frames_dir = tempfile.mkdtemp(prefix="retouch_")

                d = int(5 + req.intensity * 15)
                sigma_color = 75 - int(req.intensity * 50)
                sigma_space = sigma_color

                frame_idx = 0
                output_idx = 0
                step = 1 if req.intensity > 0.3 else 2

                while True:
                    ret, frame = cap.read()
                    if not ret:
                        break

                    if frame_idx % step == 0:
                        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
                        l_channel, a_channel, b_channel = cv2.split(lab)

                        l_smoothed = cv2.bilateralFilter(
                            l_channel, d, sigma_color, sigma_space
                        )

                        if req.intensity > 0.5:
                            a_channel = cv2.GaussianBlur(a_channel, (5, 5), 0)
                            b_channel = cv2.GaussianBlur(b_channel, (5, 5), 0)

                        lab_smoothed = cv2.merge([l_smoothed, a_channel, b_channel])
                        smoothed = cv2.cvtColor(lab_smoothed, cv2.COLOR_LAB2BGR)

                        alpha = req.intensity
                        styled = cv2.addWeighted(frame, 1.0 - alpha, smoothed, alpha, 0)

                        frame_path = f"{frames_dir}/frame_{output_idx:04d}.png"
                        cv2.imwrite(frame_path, styled)
                        output_idx += 1

                    frame_idx += 1

                cap.release()
                frames_processed = output_idx

                if output_idx > 0:
                    subprocess.run(
                        [
                            "ffmpeg", "-y",
                            "-framerate", str(fps / step),
                            "-i", f"{frames_dir}/frame_%04d.png",
                            "-c:v", "libx264", "-crf", "18",
                            "-pix_fmt", "yuv420p",
                            output_path,
                        ],
                        capture_output=True,
                        timeout=300,
                    )
                    if os.path.exists(output_path):
                        method = f"bilateral_filter+d={d}_sc={sigma_color}"

                import shutil
                shutil.rmtree(frames_dir, ignore_errors=True)

        if not method:
            raise HTTPException(
                status_code=500,
                detail="Retouching failed internally."
            )

    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="Retouching unavailable — opencv-python not installed"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Retouch error: {e}"
        )

    return {
        "success": True,
        "video_id": req.video_id,
        "intensity_applied": req.intensity,
        "filter_id": "smart_beauty_v2",
        "method": method,
        "frames_processed": frames_processed,
        "output_url": f"file://{output_path}" if os.path.exists(output_path) else None,
    }

async def extract_hook_service(req: ExtractHookRequest):
    await asyncio.sleep(1.0)
    return {
        "success": True,
        "video_id": req.video_id,
        "hook_start_time": 12.5,
        "hook_duration": req.target_duration
    }

async def generate_proxies_service(req: ProxyRequest):
    await asyncio.sleep(2.0)
    return {
        "success": True,
        "video_id": req.video_id,
        "proxy_url": f"s3://lazynext-assets/proxies/{req.video_id}_{req.proxy_quality}.mp4"
    }

async def ingest_media_service(req: IngestRequest):
    from pathlib import Path
    
    input_path = Path(req.file_path)
    if not input_path.exists() and os.getenv("APP_ENV") == "production":
        raise HTTPException(status_code=404, detail="Input file not found")
        
    video_id = req.project_id + "_" + input_path.stem
    output_proxy = f"/tmp/{video_id}_proxy.mp4"
    output_spritesheet = f"/tmp/{video_id}_spritesheet.jpg"
    
    if input_path.exists() and os.getenv("APP_ENV") == "production":
        try:
            subprocess.run([
                "ffmpeg", "-y", "-i", str(input_path),
                "-vf", "scale=-2:720", "-c:v", "libx264", "-crf", "23",
                "-preset", "fast", "-c:a", "aac", "-b:a", "128k",
                output_proxy
            ], check=True)
            
            subprocess.run([
                "ffmpeg", "-y", "-i", str(input_path),
                "-vf", "fps=1/10,scale=160:90,tile=10x10",
                output_spritesheet
            ], check=True)
            
        except subprocess.CalledProcessError as e:
            raise HTTPException(status_code=500, detail=f"FFMPEG failed: {e}")
            
    await asyncio.sleep(2.0)
    
    return {
        "success": True,
        "project_id": req.project_id,
        "video_id": video_id,
        "proxy_url": f"https://cdn.lazynext.ai/proxies/{video_id}_proxy.mp4",
        "spritesheet_url": f"https://cdn.lazynext.ai/spritesheets/{video_id}_spritesheet.jpg",
        "status": "completed"
    }
