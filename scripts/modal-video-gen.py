"""
Lazynext Video Generation — Modal GPU Endpoint (Wan 2.2)

Deploy: modal deploy scripts/modal-video-gen.py
Test:    curl -X POST $ENDPOINT_URL -d '{"prompt":"sunset"}'

Modal gives $30/month free credits. Wan 2.2 on A10G GPU.
Cost: ~$0.0005/second on A10G. Video gen: ~30-60 seconds, ~$0.02-0.03/video.
"""

import modal
from modal import App, web_endpoint, Image

app = App("lazynext-video")

# GPU-optimized image with Wan 2.2 dependencies
image = (
    Image.debian_slim(python_version="3.11")
    .pip_install(
        "diffusers",
        "transformers",
        "accelerate",
        "torch",
        "torchvision",
        "torchaudio",
        "safetensors",
        "sentencepiece",
        "huggingface_hub",
        "pillow",
        "numpy",
        "imageio",
        "imageio-ffmpeg",
    )
    .apt_install("ffmpeg")
)


@app.function(
    gpu="A10G",
    image=image,
    timeout=600,
    container_idle_timeout=300,
    allow_concurrent_inputs=5,
)
@web_endpoint(method="POST")
async def generate_video(request):
    """Generate video from text prompt using Wan 2.2 TI2V-5B.

    POST body: {"prompt": "...", "width": 1280, "height": 720, "num_frames": 24}
    Returns: {"success": true, "video_url": "...", "source": "modal-wan22"}
    """
    import os, tempfile, base64, io, json, time
    import torch

    data = await request.json()
    prompt = data.get("prompt", "a beautiful sunset")
    width = data.get("width", 1024)
    height = data.get("height", 576)
    num_frames = data.get("num_frames", 24)

    try:
        from diffusers import WanPipeline
        from diffusers.utils import export_to_video

        model_id = "Wan-AI/Wan2.2-TI2V-5B"

        print(f"[Modal] Loading Wan 2.2 from {model_id}...")
        t0 = time.time()

        pipe = WanPipeline.from_pretrained(
            model_id,
            torch_dtype=torch.float16,
        ).to("cuda")

        load_time = time.time() - t0
        print(f"[Modal] Model loaded in {load_time:.1f}s")

        print(f"[Modal] Generating: '{prompt}' ({width}x{height}, {num_frames}f)")
        t1 = time.time()

        video_frames = pipe(
            prompt=prompt,
            width=width,
            height=height,
            num_frames=num_frames,
            num_inference_steps=30,
            guidance_scale=5.0,
        ).frames[0]

        gen_time = time.time() - t1

        # Save video to bytes
        video_bytes = export_to_video(video_frames, fps=8)

        # Encode as base64 for API response
        import base64
        video_b64 = base64.b64encode(video_bytes).decode()

        print(f"[Modal] Done! Load: {load_time:.1f}s, Gen: {gen_time:.1f}s, Size: {len(video_bytes)}B")

        return {
            "success": True,
            "prompt": prompt,
            "source": "modal-wan22",
            "video_base64": video_b64,
            "load_time": round(load_time, 1),
            "gen_time": round(gen_time, 1),
        }

    except Exception as e:
        print(f"[Modal] Error: {e}")
        return {"success": False, "error": str(e)}, 500


@app.function(
    gpu="A10G",
    image=image,
    timeout=300,
    container_idle_timeout=300,
    allow_concurrent_inputs=5,
)
@web_endpoint(method="POST")
async def generate_image_to_video(request):
    """Generate video from image + prompt using Wan 2.2 I2V-5B.

    POST body: {"prompt": "...", "image_base64": "...", "num_frames": 24}
    Returns: {"success": true, "video_url": "...", "source": "modal-wan22-i2v"}
    """
    import base64, io, time, json
    import torch
    from PIL import Image

    data = await request.json()
    prompt = data.get("prompt", "")
    image_b64 = data.get("image_base64", "")
    num_frames = data.get("num_frames", 24)

    if not image_b64:
        return {"success": False, "error": "image_base64 required"}, 400

    try:
        from diffusers import WanPipeline
        from diffusers.utils import export_to_video

        model_id = "Wan-AI/Wan2.2-I2V-5B"

        print(f"[Modal] Loading Wan 2.2 I2V...")
        t0 = time.time()

        pipe = WanPipeline.from_pretrained(
            model_id,
            torch_dtype=torch.float16,
        ).to("cuda")

        load_time = time.time() - t0

        # Decode image
        image = Image.open(io.BytesIO(base64.b64decode(image_b64)))

        print(f"[Modal] Generating I2V: '{prompt}'")
        t1 = time.time()

        video_frames = pipe(
            image=image,
            prompt=prompt,
            num_frames=num_frames,
            num_inference_steps=30,
            guidance_scale=5.0,
        ).frames[0]

        gen_time = time.time() - t1
        video_bytes = export_to_video(video_frames, fps=8)
        video_b64 = base64.b64encode(video_bytes).decode()

        return {
            "success": True,
            "source": "modal-wan22-i2v",
            "video_base64": video_b64,
            "load_time": round(load_time, 1),
            "gen_time": round(gen_time, 1),
        }

    except Exception as e:
        return {"success": False, "error": str(e)}, 500
