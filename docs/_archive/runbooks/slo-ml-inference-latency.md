# SLO Runbook: ML Inference Latency

## Services
- **Pre-Processing** (`services/pre-processing` on port 8000) — Python FastAPI: Whisper transcription, SAM2 rotoscoping, NeRF extraction.
- **Generative Studio** (`services/generative-studio` on port 8001) — Python FastAPI: Stable Video Diffusion, ElevenLabs dubbing, Demucs stem separation.

Both services expose a common set of inference latency metrics, collectively referred to as "ML inference" in this runbook.

## SLO Targets

| Inference Type | Service | Port | SLO Target | Measurement Window |
|---|---|---|---|---|
| Whisper transcription | Pre-Processing | 8000 | P95 latency < 1.5x real-time of audio duration | 28 days |
| SAM2 rotoscoping | Pre-Processing | 8000 | P95 latency < 30 seconds per frame | 28 days |
| NeRF extraction | Pre-Processing | 8000 | P95 latency < 5 minutes per scene | 28 days |
| Stable Video Diffusion | Generative Studio | 8001 | P95 latency < 120 seconds per 2-second clip | 28 days |
| ElevenLabs dubbing | Generative Studio | 8001 | P95 latency < 2x real-time of audio duration | 28 days |
| Demucs stem separation | Generative Studio | 8001 | P95 latency < 3x real-time of audio duration | 28 days |

- **Composite SLO**: 99% of all inference requests across both services meet their per-type latency target (measured over a 28-day rolling window).
- **Excluded from SLO**: Cold-start requests (first request after a scale-to-zero event), indicated by the `inference_cold_start` label on the metric.

## Alert Triggers

| Alert Name | Severity | Condition | Prometheus Rule `for` |
|---|---|---|---|
| `MLInferenceP95LatencyHigh` | Warning | `histogram_quantile(0.95, rate(inference_duration_seconds_bucket[15m])) > inference_slo_target_seconds` (per inference type) | 15m |
| `MLInferenceP99LatencyHigh` | Critical | `histogram_quantile(0.99, rate(inference_duration_seconds_bucket[15m])) > inference_slo_target_seconds * 2` | 10m |
| `MLInferenceErrorRateHigh` | Critical | `rate(inference_errors_total[15m]) / rate(inference_requests_total[15m]) > 0.05` | 10m |
| `MLInferenceQueueDepth` | Warning | `inference_queue_depth > 20` (any inference type) | 10m |
| `MLInferenceQueueDepthCritical` | Critical | `inference_queue_depth > 100` (any inference type) | 5m |
| `MLGPUUtilizationLow` | Warning | Avoidable cost alert: `DCGM_FI_DEV_GPU_UTIL < 0.30` while `inference_queue_depth > 10` | 30m |
| `MLGPUUtilizationHigh` | Warning | `DCGM_FI_DEV_GPU_UTIL > 0.95` sustained (potential throttling) | 15m |
| `MLGPUVRAMNearFull` | Critical | `DCGM_FI_DEV_FB_USED / DCGM_FI_DEV_FB_TOTAL > 0.95` | 5m |
| `MLGPUECCErrors` | Critical | `rate(DCGM_FI_DEV_ECC_DBE_ERRORS[5m]) > 0` (double-bit ECC errors) | 1m |
| `MLModelDownloadFailure` | Warning | `rate(model_cache_download_failures_total[15m]) > 0` | 15m |
| `MLSLOBurnRate` | Critical | Multi-burn-rate on `inference_slo_violation_total`: 14.4x for 1h OR 6x for 6h | — |

## Prometheus Queries

### Per-inference-type P95 latency vs. SLO target
```promql
# Are any inference types breaching their P95 target?
histogram_quantile(0.95,
  rate(inference_duration_seconds_bucket[15m])
) by (inference_type, service)
  > on(inference_type) group_left
inference_slo_target_seconds
```

### P99 latency (for worst-case tail detection)
```promql
# 99th percentile — the true tail
histogram_quantile(0.99,
  rate(inference_duration_seconds_bucket[15m])
) by (inference_type, service)
```

### Error rate by inference type
```promql
# Which inference path is failing most?
rate(inference_errors_total[15m]) by (inference_type, error_code)
  /
rate(inference_requests_total[15m]) by (inference_type)
```

### Queue depth per inference type
```promql
# How many requests are waiting to be processed?
inference_queue_depth by (inference_type, service)
```

### GPU utilization (from NVIDIA DCGM)
```promql
# Average GPU utilization across all ML nodes
avg(DCGM_FI_DEV_GPU_UTIL{pod=~"ml-worker-.*"}) by (UUID, model_name)
```

### GPU VRAM usage
```promql
# Percentage of framebuffer memory consumed
DCGM_FI_DEV_FB_USED{pod=~"ml-worker-.*"}
  / on(UUID) group_left
DCGM_FI_DEV_FB_TOTAL
```

### GPU temperature
```promql
# Thermal throttling risk if sustained above 85C
DCGM_FI_DEV_GPU_TEMP{pod=~"ml-worker-.*"}
```

### Model cache hit ratio
```promql
# Are models being fetched from the warm cache or re-downloaded?
rate(model_cache_hits_total[15m])
  /
(rate(model_cache_hits_total[15m]) + rate(model_cache_misses_total[15m]))
```

### Per-request latency breakdown (if tracing spans are exported)
```promql
# Which phase of inference is slowest?
histogram_quantile(0.95,
  rate(inference_phase_duration_seconds_bucket[15m])
) by (phase, inference_type)
# Phases: preprocess, model_inference, postprocess, io
```

### SLO violation rate (composite)
```promql
# Overall fraction of requests exceeding their SLO target
sum(rate(inference_slo_violation_total[28d])) by (inference_type)
  /
sum(rate(inference_requests_total[28d])) by (inference_type)
```

### Cold start latency (for informational purposes — excluded from SLO)
```promql
# How long do cold starts take?
histogram_quantile(0.95,
  rate(inference_duration_seconds_bucket{cold_start="true"}[1h])
) by (inference_type)
```

### SLO burn rate
```promql
# 1-hour burn rate (composite)
sum(rate(inference_slo_violation_total[1h]))
  / (sum(rate(inference_requests_total[1h])) * 0.01)

# 6-hour burn rate (composite)
sum(rate(inference_slo_violation_total[6h]))
  / (sum(rate(inference_requests_total[6h])) * 0.01)
```

## Diagnostic Steps

### Step 1 — Identify the affected inference type(s)
```bash
# Check pre-processing service health
curl -s http://localhost:8000/health | jq .

# Check generative-studio service health
curl -s http://localhost:8001/health | jq .

# Get queue depths and recent error counts per endpoint
curl -s http://localhost:8000/admin/metrics | jq '.queues'
curl -s http://localhost:8001/admin/metrics | jq '.queues'
```

### Step 2 — Inspect GPU node health
```bash
# List GPU nodes and their status
kubectl get nodes -l accelerator=nvidia -o wide

# Check NVIDIA DCGM metrics on a specific GPU node
kubectl exec -it -n lazynext dcgm-exporter-<pod> -- \
  dcgmi dmon -e 203,204,205,252,1001 -c 1

# Check for GPU Xid errors (fatal GPU errors) in kernel log
kubectl exec -it -n lazynext <ml-worker-pod> -- dmesg | grep -i "NVRM: Xid"

# Check GPU process listing
kubectl exec -it -n lazynext <ml-worker-pod> -- nvidia-smi
```

### Step 3 — Profile slow inference requests
1. Pick a recent slow request from the logs or Prometheus exemplars.
2. Check the OpenTelemetry trace for that request in Grafana Tempo / Jaeger to find the bottleneck span.
3. Common bottlenecks:
    - **I/O phase**: Large asset download from local filesystem. Check network throughput on the pod.
   - **Preprocessing phase**: Video decode, audio resampling, image resize. Check CPU utilization.
   - **Model inference phase**: GPU kernel launch overhead, VRAM swaps. Check GPU metrics.
   - **Postprocessing phase**: Format conversion, output encoding.

### Step 4 — Check model cache state
```bash
# Verify model files exist and are not corrupted
kubectl exec -it -n lazynext <ml-worker-pod> -- ls -lh /models/
kubectl exec -it -n lazynext <ml-worker-pod> -- sha256sum /models/*.pt /models/*.onnx

# Check disk space on the model volume
kubectl exec -it -n lazynext <ml-worker-pod> -- df -h /models
```

### Step 5 — Examine recent error logs
```bash
# Pre-processing service errors (last 15 minutes)
kubectl logs -n lazynext deployment/pre-processing --since=15m | grep -E "ERROR|CRITICAL|Traceback" | tail -50

# Generative studio errors (last 15 minutes)
kubectl logs -n lazynext deployment/generative-studio --since=15m | grep -E "ERROR|CRITICAL|Traceback" | tail -50
```

### Step 6 — Check for external dependency failures
1. **ElevenLabs API**: Check ElevenLabs status page and API key validity.
2. **Modal model hub**: If models are fetched from Modal at runtime, check Modal status.
3. **Local filesystem**: Verify the storage is reachable and not throttling.

### Step 7 — Determine if this is a workload shift or infrastructure issue
```bash
# Compare current request mix to the baseline (last 7 days)
# Higher proportion of heavy inference types can shift overall latency
curl -s http://localhost:8000/admin/metrics | jq '.requests_by_type'
curl -s http://localhost:8001/admin/metrics | jq '.requests_by_type'
```

## Mitigation Steps

### Tactic A — Queue backlog
1. **Enable request prioritization**: Set `ML_PRIORITY_QUEUE_ENABLED=true` and ensure user-initiated interactive requests get priority over batch/background jobs.
2. **Scale up GPU workers**:
   ```bash
   kubectl scale deployment ml-worker -n lazynext --replicas=<current+2>
   ```
   If using KEDA for auto-scaling, increase the max replica count temporarily:
   ```bash
   kubectl patch scaledobject ml-worker-scaler -n lazynext \
     --patch '{"spec":{"maxReplicaCount":10}}'
   ```
3. **Throttle low-priority jobs**: Set `ML_MAX_BATCH_CONCURRENCY=1` to reserve GPU capacity for interactive requests.
4. **Drop stale queue items** that have been waiting too long:
   ```bash
   curl -X POST http://pre-processing.lazynext:8000/admin/purge-queue \
     -H 'Content-Type: application/json' \
     -d '{"older_than_seconds": 600}'
   ```

### Tactic B — High per-request latency
1. **Reduce model precision**: Set `TORCH_INFERENCE_DTYPE=float16` (from float32) to cut inference time by ~40% with minimal quality loss.
2. **Reduce batch size or frame resolution**: For SAM2, reduce the input resolution cap:
   ```bash
   # In the service env
   SAM2_MAX_DIMENSION=1024  # down from 1920
   ```
3. **Enable dynamic batching**: If not already on, enable vLLM or TorchServe dynamic batching for models that support it.
4. **Switch to a faster model variant**: For Whisper, use `whisper-large-v3-turbo` instead of `whisper-large-v3` if latency is critical.
5. **Pre-warm the GPU**: If cold starts are inflating tail latency (even though excluded from SLO), run periodic no-op inferences to keep the GPU warm.

### Tactic C — High error rate
1. **Identify the dominant error code** from `inference_errors_total by (error_code)`.
2. **GPU OOM errors**: Reduce per-request batch size or enable gradient checkpointing (for diffusion models):
   ```bash
   # Env vars to set on the worker
   PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
   ```
3. **Model load failures**: Clear the model cache and force a re-download:
   ```bash
   kubectl exec -it -n lazynext <ml-worker-pod> -- rm -rf /models/*
   kubectl rollout restart deployment/ml-worker -n lazynext
   ```
4. **Input validation errors**: If a specific input pattern is causing crashes, add input validation/shape checking to the API layer or temporarily reject inputs matching the problematic pattern.
5. **GPU ECC errors**: A GPU with double-bit ECC errors must be cordoned and drained immediately (unrecoverable hardware fault):
   ```bash
   kubectl cordon <gpu-node>
   kubectl drain <gpu-node> --ignore-daemonsets --delete-emptydir-data
   ```
    Then file a Linode hardware replacement ticket.

### Tactic D — GPU VRAM saturation
1. **Identify the VRAM-heavy model**:
   ```bash
   kubectl exec -it -n lazynext <ml-worker-pod> -- nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv
   ```
2. **Free VRAM by reducing concurrency** on that model, or by moving a model to a dedicated GPU.
3. **Enable model offloading**: Set `STABLE_DIFFUSION_ENABLE_MODEL_CPU_OFFLOAD=true` to move unused model components to CPU RAM between inference calls.
4. **Add a VRAM guard**: If VRAM usage exceeds 90%, reject new inference requests with HTTP 429 (too many requests) until VRAM frees up, rather than letting requests OOM.

### Tactic E — External API degradation (Gemini TTS, Modal)
1. **Enable local fallback**: Use locally cached Coqui XTTS v2 model when the API is slow or unavailable.
2. **Cache model weights**: Ensure all models are pre-cached in the Docker image or on a persistent volume, so Modal outages don't block inference.
3. **Circuit breaker**: The service should already trip a circuit breaker after 5 consecutive failures to an external API, serving stale results or returning a degraded-mode response.

## Escalation Policy

| Level | Role | When to Escalate | Contact |
|-------|------|-------------------|---------|
| **L1** | On-call engineer (24/7 rotation) | First responder for all ML inference alerts | Grafana OnCall → `ml-oncall` |
| **L2** | ML platform engineer | L1 cannot resolve within 30 minutes; GPU hardware issues, model loading failures, or queue sustained > 50 | Grafana OnCall → `ml-platform-oncall` |
| **L3** | ML research engineer (model-specific issues) + Infrastructure lead | L2 cannot resolve within 60 minutes; model quality degradation, ECC errors requiring HW replacement, or regional GPU capacity shortage | Slack `#ml-platform` + `#ops-leads` → call |
| **L4** | VP Engineering | L3 not reached within 15 minutes; user-facing impact exceeds 1 hour; cost of idle GPU capacity exceeding $500/hr | Phone tree |

### Escalation timeline
- **15 minutes** — L1 acknowledges and posts to `#ops-incidents`.
- **30 minutes** — Escalate to L2 if queue remains above 50 or error rate > 10%.
- **60 minutes** — Escalate to L3 if GPU hardware fault is confirmed or if both services are degraded simultaneously.
- **90 minutes** — Declare major incident if user-facing ML features (transcription, rotoscoping, generative fill, dubbing) are non-functional.
- **120 minutes** — Public status page update.

### Note on GPU cost escalation
GPU instances are the single largest infrastructure cost for Lazynext. An incident that leaves GPUs idle with a queued backlog wastes compute budget at a high rate. When escalating to L3/L4, include the estimated cost burn rate:
```
GPU cost burn rate: <N> × Standard_NC24ads_A100_v4 @ $X/hr = $Y/hr wasted
```

## Post-Incident Checklist

1. [ ] **Drain the inference queue** — Confirm all queues are back to baseline depth.
2. [ ] **Verify inference quality** — Compare the output of 10 recent inference requests against golden reference outputs to confirm no quality regression:
   ```bash
   cd /Users/avaspatel/Lazynext/services/pre-processing
   python -m pytest tests/inference_quality/ --recent-n 10
   ```
3. [ ] **Restore GPU health** — Run `nvidia-smi` and `dcgmi diag -r 3` on all GPU nodes that were affected.
4. [ ] **Restore configuration** — Revert temporary overrides (precision, resolution caps, queue settings, replica counts).
5. [ ] **Run ML integration tests**:
   ```bash
   cd /Users/avaspatel/Lazynext
   # Pre-processing tests
   cd services/pre-processing && pytest tests/ -x --timeout 300
   # Generative studio tests
   cd ../generative-studio && pytest tests/ -x --timeout 300
   ```
6. [ ] **Capture evidence** — Attach to the incident ticket:
   - Grafana dashboard screenshots (ML Inference Overview, GPU Node Health).
   - Service logs for both pre-processing and generative-studio for the incident window.
   - DCGM metrics export (GPU utilization, VRAM, temperature, ECC errors).
   - `nvidia-smi` output from affected GPU nodes.
   - Sample slow/failed request trace IDs for postmortem analysis.
7. [ ] **Root cause analysis** — Draft within 24 hours. Common failure modes:
   - GPU hardware fault (ECC errors, thermal throttling, driver crash).
   - Model loading failure (cache corruption, Modal outage, disk full).
   - Input data anomaly triggering pathological model behavior.
   - Resource contention from a concurrent high-priority workload.
   - Inference library or CUDA version regression from a recent dependency update.
8. [ ] **Action items** — Create tickets with owners and due dates:
   - Hardware replacement (if GPU ECC or thermal issue).
   - Model caching improvements (pre-cache, checksum validation, fallback).
   - Input validation hardening.
   - Additional alert rules for the newly observed failure signature.
   - Circuit breaker or graceful degradation for the affected inference path.
9. [ ] **Update runbook** — Incorporate new diagnostic queries or mitigation tactics discovered during the incident.
10. [ ] **SLO review** — Calculate error budget consumed. If composite error budget is exhausted, freeze non-essential ML pipeline changes until it recovers.
11. [ ] **GPU cost analysis** — Calculate the total GPU cost incurred during the incident (idle time + retry time). Include in the postmortem.
12. [ ] **Postmortem** — Schedule within 5 business days for severity-1 incidents. Invite ML platform, infrastructure, and affected product teams.

## Appendix: GPU Node Specifications

| SKU | GPU | VRAM | vCPUs | RAM | Typical Workload |
|-----|-----|------|-------|-----|------------------|
| `Standard_NC24ads_A100_v4` | 1 × NVIDIA A100 80GB | 80 GB | 24 | 220 GB | Stable Video Diffusion, NeRF extraction |
| `Standard_NC8as_T4_v3` | 1 × NVIDIA T4 16GB | 16 GB | 8 | 56 GB | Whisper transcription, Demucs stem separation, SAM2 rotoscoping |

## References
- Pre-Processing service: `/Users/avaspatel/Lazynext/services/pre-processing/`
- Generative Studio service: `/Users/avaspatel/Lazynext/services/generative-studio/`
- Python ML dependencies: `services/pre-processing/requirements.txt`, `services/generative-studio/requirements.txt`
- NVIDIA DCGM exporter: `https://github.com/NVIDIA/dcgm-exporter`
- GPU instance types (Linode): `https://www.linode.com/products/gpu/`
- Multi-burn-rate alerts: `https://sre.google/workbook/alerting-on-slos/`
