"""
Lazynext Video Generation — Modal GPU Endpoint (CogVideoX-5B)

Deploy: modal deploy scripts/modal-video-gen.py

Modal gives $30/month free credits. CogVideoX-5B on A10G GPU.
~30-45s per video, confirmed working with diffusers.
"""

import modal
from modal import App, Image

app = App("lazynext-video")

image = (
    Image.debian_slim(python_version="3.11")
    .pip_install(
        "diffusers>=0.32.0",
        "transformers>=4.48.0",
        "accelerate",
        "torch",
        "torchvision",
        "torchaudio",
        "safetensors",
        "huggingface_hub",
        "pillow",
        "numpy",
        "imageio",
        "imageio-ffmpeg",
        "fastapi",
        "tiktoken",
        "sentencepiece",
    )
    .apt_install("ffmpeg")
)


@app.function(gpu="A10G", image=image, timeout=600, scaledown_window=300)
@modal.concurrent(max_inputs=5)
@modal.fastapi_endpoint(method="POST")
def generate_video(prompt: str = "a beautiful sunset",
                   width: int = 1024,
                   height: int = 576,
                   num_frames: int = 49):
    import base64, time, torch
    from diffusers import CogVideoXPipeline
    from diffusers.utils import export_to_video

    model_id = "THUDM/CogVideoX-5b"

    print(f"[Modal] Loading {model_id}...")
    t0 = time.time()

    pipe = CogVideoXPipeline.from_pretrained(
        model_id,
        torch_dtype=torch.bfloat16,
    )
    pipe.enable_model_cpu_offload()
    pipe.vae.enable_slicing()
    pipe.vae.enable_tiling()
    pipe.enable_sequential_cpu_offload()

    load_time = time.time() - t0
    print(f"[Modal] Loaded in {load_time:.1f}s")

    print(f"[Modal] Generating: '{prompt}'")
    t1 = time.time()

    output = pipe(
        prompt=prompt,
        num_videos_per_prompt=1,
        num_inference_steps=20,
        num_frames=min(num_frames, 17),
        guidance_scale=6.0,
        generator=torch.Generator(device="cuda").manual_seed(42),
    )
    video_frames = output.frames[0]

    gen_time = time.time() - t1
    tmp = "/tmp/video.mp4"
    export_to_video(video_frames, tmp, fps=8)
    with open(tmp, "rb") as f:
        video_bytes = f.read()
    video_b64 = base64.b64encode(video_bytes).decode("utf-8")

    print(f"[Modal] Done! Load: {load_time:.1f}s Gen: {gen_time:.1f}s Size: {len(video_bytes)}B")

    return {
        "success": True,
        "source": "modal-cogvideox",
        "video_base64": video_b64,
        "load_time": round(load_time, 1),
        "gen_time": round(gen_time, 1),
        "size": len(video_bytes),
    }
