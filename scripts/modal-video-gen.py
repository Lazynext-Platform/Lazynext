"""
Lazynext Video Generation — Modal GPU Endpoint (Wan 2.2)

Deploy: modal deploy scripts/modal-video-gen.py
Test:    curl -X POST $ENDPOINT_URL -d '{"prompt":"sunset"}'

Modal gives $30/month free credits. Wan 2.2 on A10G GPU.
Cost: ~$0.02-0.03/video, 30-60 seconds, auto-scaling.
"""

import modal
from modal import App, Image

app = App("lazynext-video")

image = (
    Image.debian_slim(python_version="3.11")
    .pip_install(
        "diffusers", "transformers", "accelerate",
        "torch", "torchvision", "torchaudio",
        "safetensors", "huggingface_hub",
        "pillow", "numpy", "imageio", "imageio-ffmpeg",
        "fastapi",
    )
    .apt_install("ffmpeg")
)


@app.function(gpu="A10G", image=image, timeout=600, scaledown_window=300)
@modal.concurrent(max_inputs=5)
@modal.fastapi_endpoint(method="POST")
def generate_video(prompt: str = "a beautiful sunset",
                   width: int = 1024, height: int = 576,
                   num_frames: int = 24):
    import base64, time, torch, io
    from diffusers import WanPipeline
    from diffusers.utils import export_to_video

    model_id = "Wan-AI/Wan2.2-TI2V-5B"

    print(f"[Modal] Loading Wan 2.2...")
    t0 = time.time()

    pipe = WanPipeline.from_pretrained(
        model_id, torch_dtype=torch.float16
    ).to("cuda")

    load_time = time.time() - t0

    print(f"[Modal] Generating: '{prompt}'")
    t1 = time.time()

    video_frames = pipe(
        prompt=prompt, width=width, height=height,
        num_frames=num_frames, num_inference_steps=30,
        guidance_scale=5.0,
    ).frames[0]

    gen_time = time.time() - t1
    video_bytes = export_to_video(video_frames, fps=8)
    video_b64 = base64.b64encode(video_bytes).decode()

    return {
        "success": True, "source": "modal-wan22",
        "video_base64": video_b64,
        "load_time": round(load_time, 1),
        "gen_time": round(gen_time, 1),
    }


@app.function(gpu="A10G", image=image, timeout=600, scaledown_window=300)
@modal.concurrent(max_inputs=5)
@modal.fastapi_endpoint(method="POST")
def generate_i2v(prompt: str = "", image_base64: str = "",
                 num_frames: int = 24):
    import base64, time, torch, io
    from PIL import Image
    from diffusers import WanPipeline
    from diffusers.utils import export_to_video

    model_id = "Wan-AI/Wan2.2-I2V-5B"

    pipe = WanPipeline.from_pretrained(
        model_id, torch_dtype=torch.float16
    ).to("cuda")

    image = Image.open(io.BytesIO(base64.b64decode(image_base64)))

    video_frames = pipe(
        image=image, prompt=prompt,
        num_frames=num_frames, num_inference_steps=30,
        guidance_scale=5.0,
    ).frames[0]

    video_bytes = export_to_video(video_frames, fps=8)
    video_b64 = base64.b64encode(video_bytes).decode()

    return {
        "success": True, "source": "modal-wan22-i2v",
        "video_base64": video_b64,
    }
