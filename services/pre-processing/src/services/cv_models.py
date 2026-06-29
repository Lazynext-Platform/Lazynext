import asyncio
import os
import httpx
from fastapi import HTTPException
from src.models import RotoscopeRequest, NeRFRequest
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from nerf_pipeline import NerfPipeline, NerfConfig
from sam2_pipeline import Sam2Pipeline, Sam2Config

TF_SERVING_URL = os.getenv("TF_SERVING_URL", "http://tensorflow-serving:8501")

async def rotoscope_service(req: RotoscopeRequest):
    video_path = f"/tmp/{req.video_id}.mp4"
    mask_dir = f"/tmp/masks_{req.video_id}"
    os.makedirs(mask_dir, exist_ok=True)
    
    config = Sam2Config()
    pipeline = Sam2Pipeline(config)
    
    # Run ONNX inference in a thread pool executor
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, pipeline.rotoscope, video_path, req.object_prompt, mask_dir)

    if not result.success:
        # Fallback to TensorFlow Serving if ONNX fails (e.g. model not found)
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{TF_SERVING_URL}/v1/models/sam2:predict",
                    json={"instances": [{"video_id": req.video_id, "prompt": req.object_prompt}]},
                    timeout=5.0
                )
                response.raise_for_status()
                result.success = True
                result.method = "tensorflow_serving_sam2"
                result.mask_sequence_path = mask_dir
        except httpx.RequestError:
            raise HTTPException(
                status_code=503,
                detail=f"Rotoscoping unavailable — ONNX inference failed ({result.error}) and TF Serving is unreachable."
            )

    return {
        "success": True,
        "video_id": req.video_id,
        "object": req.object_prompt,
        "source": result.method,
        "mask_sequence_url": f"file://{result.mask_sequence_path}" if result.mask_sequence_path else None,
    }

async def extract_nerf_service(req: NeRFRequest):
    video_path = f"/tmp/{req.video_id}.mp4"
    output_dir = f"/tmp/nerf_{req.video_id}"

    config = NerfConfig(method=req.method)
    pipeline = NerfPipeline(config)

    # NeRF is inherently a long-running process
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, pipeline.extract_3d, video_path, output_dir)
    
    if not result.success:
        raise HTTPException(
            status_code=503,
            detail=f"NeRF extraction unavailable — {result.error}"
        )

    return {
        "success": True,
        "video_id": req.video_id,
        "method": req.method,
        "source": result.method,
        "mesh_url": f"file://{result.model_path}" if result.model_path else None,
        "point_cloud_url": f"file://{result.point_cloud_path}" if result.point_cloud_path else None,
    }
