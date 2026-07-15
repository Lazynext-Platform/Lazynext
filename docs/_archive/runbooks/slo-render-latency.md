# SLO Runbook: Render Latency

## Service
**Render Service** (`services/render-service` on port 8003) — Node.js (Bun) FFMPEG render farm with SSE progress streaming. Responsible for all video export jobs including MP4, ProRes, DCP, and AAF output.

## SLO Target
- **Objective**: 95% of render jobs complete within their expected duration + 20% headroom (measured over a 28-day rolling window).
- **Expected duration** is calculated per-job based on:
  - Total composition duration in seconds.
  - Output resolution and bitrate.
  - Number of enabled blend modes and GPU effects.
  - A baseline calibration of 1.2x real-time on the standard worker tier (`D4s_v5`).
- **Measurement**: `render_job_duration_seconds / render_job_estimated_duration_seconds`. The SLO is breached when this ratio exceeds 1.20 for more than 5% of jobs in the window.
- **Excluded from SLO**: Jobs queued for more than 5 minutes due to worker unavailability (tracked separately via `render_queue_wait_seconds`).

## Alert Triggers

| Alert Name | Severity | Condition | Prometheus Rule `for` |
|---|---|---|---|
| `RenderJobQueueDepth` | Warning | `render_jobs_queued > 50` | 15m |
| `RenderJobQueueDepthCritical` | Critical | `render_jobs_queued > 200` | 5m |
| `RenderJobFailureRate` | Critical | `rate(render_jobs_failed_total[15m]) / rate(render_jobs_completed_total[15m]) > 0.10` | 10m |
| `RenderJobP95Latency` | Warning | `histogram_quantile(0.95, rate(render_job_duration_seconds_bucket[15m])) > render_job_estimated_duration_seconds * 1.5` | 15m |
| `RenderWorkerCPUThrottling` | Warning | `rate(container_cpu_cfs_throttled_seconds_total{pod=~"render-worker-.*"}[5m]) > 10` | 10m |
| `RenderWorkerOOMKills` | Critical | `rate(container_oom_kills_total{pod=~"render-worker-.*"}[5m]) > 0` | 5m |
| `RenderFFMPEGProcessStuck` | Warning | `rate(render_ffmpeg_stuck_total[10m]) > 0` | 10m |
| `RenderSLOBurnRate` | Critical | Multi-burn-rate: 14.4x for 1h window OR 6x for 6h window on `render_job_slo_violation_ratio` | — |
| `RenderWorkerScaleCeiling` | Warning | `kube_hpa_status_current_replicas{deployment="render-worker"} == kube_hpa_spec_max_replicas{deployment="render-worker"}` (HPA at max) | 15m |

## Prometheus Queries

### Queue depth
```promql
# Current number of jobs waiting in the render queue
render_jobs_queued{service="render-service"}
```

### Job failure rate
```promql
# Percentage of jobs that are failing (5-min window)
rate(render_jobs_failed_total{service="render-service"}[15m])
  /
rate(render_jobs_completed_total{service="render-service"}[15m])
```

### P95 render duration vs. estimate
```promql
# How much slower are the slowest jobs compared to their estimates?
histogram_quantile(0.95,
  rate(render_job_duration_seconds_bucket{service="render-service"}[15m])
)
  /
avg(render_job_estimated_duration_seconds{service="render-service"})
```

### SLO violation ratio (per-job slow/fast classification)
```promql
# What fraction of completed jobs are breaching the 1.20x threshold?
sum(rate(render_jobs_slo_violation_total{service="render-service"}[28d]))
  /
sum(rate(render_jobs_completed_total{service="render-service"}[28d]))
```

### Worker CPU throttling
```promql
# Workers being CPU-throttled (should be near zero)
rate(container_cpu_cfs_throttled_seconds_total{
  namespace="lazynext",
  pod=~"render-worker-.*"
}[5m])
```

### Worker memory pressure
```promql
# Workers approaching their memory limit
container_memory_working_set_bytes{pod=~"render-worker-.*"}
  / on(pod) group_left
kube_pod_container_resource_limits{resource="memory", pod=~"render-worker-.*"}
```

### FFMPEG stall detection
```promql
# FFMPEG processes that have produced zero output frames in the last 30 seconds
rate(render_ffmpeg_extracted_frames_total{service="render-service"}[30s]) == 0
  and on(job_id)
render_job_status{status="rendering"}
```

### Per-output-format duration distribution
```promql
# Compare latency across output formats
histogram_quantile(0.95,
  rate(render_job_duration_seconds_bucket{service="render-service"}[1h])
) by (output_format)
```

### SLO burn rate
```promql
# 1-hour burn rate
sum(rate(render_jobs_slo_violation_total[1h]))
  / (sum(rate(render_jobs_completed_total[1h])) * 0.05)

# 6-hour burn rate
sum(rate(render_jobs_slo_violation_total[6h]))
  / (sum(rate(render_jobs_completed_total[6h])) * 0.05)
```

## Diagnostic Steps

### Step 1 — Assess queue and worker health
```bash
# Check render service health
curl -s http://localhost:8003/health | jq .

# Check queue depth and worker count
curl -s http://localhost:8003/admin/status | jq '{queue_depth, active_workers, completed_24h, failed_24h}'
```

### Step 2 — Identify problematic job patterns
```bash
# List currently queued jobs with their estimates
curl -s http://localhost:8003/admin/queue | jq '.jobs[] | {id, output_format, estimated_seconds, queued_seconds: (now - .queued_at)}'

# List recently failed jobs
curl -s http://localhost:8003/admin/jobs?status=failed&limit=20 | jq '.jobs[] | {id, output_format, error, duration}'
```

### Step 3 — Inspect individual worker pods
```bash
# List render workers and their resource usage
kubectl top pods -n lazynext -l app=render-worker

# Check logs of the busiest worker
kubectl logs -n lazynext deployment/render-worker --tail=200 | grep -E "ERROR|WARN|stuck|OOM|timeout"

# Check for recent restarts
kubectl get pods -n lazynext -l app=render-worker -o json | jq '.items[] | {name: .metadata.name, restarts: .status.containerStatuses[0].restartCount}'
```

### Step 4 — Check FFMPEG process health on a worker
```bash
# Exec into a worker and inspect running FFMPEG processes
kubectl exec -it -n lazynext <worker-pod-name> -- sh -c \
  "ps aux | grep ffmpeg | wc -l && top -b -n 1 | head -20"
```

### Step 5 — Correlate with upstream changes
1. Check if a new preset, output format, or encoder setting was recently rolled out.
2. Check if the composition complexity (blend modes, effects, resolution) has shifted — query the metric `render_job_composition_complexity_score` for recent jobs.
3. Check if the input asset pipeline (`pre-processing` service) is delivering abnormally large or unoptimized assets.

### Step 6 — Verify storage throughput
```bash
# Check IOPS and throughput on the local NVMe/SSD storage used for render scratch
ssh linode-instance "iostat -x 1 10"
```

### Step 7 — Check for noisy neighbor effects
If multiple render jobs share the same worker node:
```bash
kubectl get pods -n lazynext -o wide -l app=render-worker
# If multiple pods on the same node, check node resource pressure
kubectl describe node <node-name> | grep -A 10 "Conditions:"
```

## Mitigation Steps

### Tactic A — Queue backlog
1. **Pause non-essential jobs**: Set `RENDER_ACCEPT_NEW_JOBS=false` on the render service to stop accepting low-priority jobs. Existing jobs continue.
   ```bash
   curl -X POST http://render-service.lazynext:8003/admin/pause-queue
   ```
2. **Scale out workers**: Increase the HPA maximum replicas temporarily:
   ```bash
   kubectl patch hpa render-worker-hpa -n lazynext \
     --patch '{"spec":{"maxReplicas":20}}'
   ```
   Wait for new pods to become ready (`kubectl wait --for=condition=ready pod -l app=render-worker --timeout=300s`).
3. **Drop the oldest queued jobs** if the queue is dominated by stuck or extremely large jobs:
   ```bash
   curl -X POST http://render-service.lazynext:8003/admin/purge-queue \
     -H 'Content-Type: application/json' \
     -d '{"older_than_seconds": 3600, "min_priority": "low"}'
   ```

### Tactic B — High failure rate
1. **Identify the common failure signature** across failed jobs (grep logs for the top error, check if it correlates with a specific output format or encoder).
2. If a specific output profile is broken (e.g., all AAF exports fail), temporarily disable that codec path:
   ```bash
   curl -X POST http://render-service.lazynext:8003/admin/disable-format \
     -H 'Content-Type: application/json' \
     -d '{"format": "aaf"}'
   ```
3. If failures are caused by corrupt input assets, identify the asset IDs and notify the content owner. Re-trigger pre-processing for those assets.
4. Roll back the render service deployment if the failures started after a recent release:
   ```bash
   kubectl rollout undo deployment/render-service -n lazynext
   ```

### Tactic C — Worker resource exhaustion
1. **CPU throttling**: The worker's CPU limit is likely too low for the current workload. Bump it temporarily:
   ```bash
   kubectl set resources deployment/render-worker -n lazynext \
     --limits=cpu=4,memory=8Gi --requests=cpu=2,memory=4Gi
   ```
2. **Memory pressure / OOM kills**: Reduce `FFMPEG_THREADS` per job to lower peak memory, or increase the worker memory limit. If OOMs persist, split large compositions into segments before rendering.
3. **Node-level resource starvation**: Cordoning and draining the overcommitted node will force worker pods to reschedule onto healthier nodes.

### Tactic D — FFMPEG process stuck
1. A stuck FFMPEG process is one that has produced zero output frames for 30+ seconds. Identify the stalled job:
   ```bash
   curl -s http://render-service.lazynext:8003/admin/jobs?status=rendering | \
     jq '.jobs[] | select(.ffmpeg_last_frame_timestamp < (now - 30)) | .id'
   ```
2. Attempt a graceful cancel and retry:
   ```bash
   curl -X POST http://render-service.lazynext:8003/admin/jobs/<job-id>/retry
   ```
3. If multiple jobs are stuck on the same worker, restart that specific worker pod:
   ```bash
   kubectl delete pod -n lazynext <stuck-worker-pod>
   ```

### Tactic E — Storage bottleneck
1. If local storage IOPS is saturated, reduce the number of concurrent render jobs per worker (increase `RENDER_JOB_CONCURRENCY` env var to lower parallelism on disk-heavy jobs).
2. Switch high-throughput jobs to use the local ephemeral SSD for scratch, with final output written to persistent storage only at completion.

## Escalation Policy

| Level | Role | When to Escalate | Contact |
|-------|------|-------------------|---------|
| **L1** | On-call engineer (24/7 rotation) | First responder for all render alerts | Grafana OnCall → `render-oncall` |
| **L2** | Media pipeline engineer | L1 cannot resolve within 30 minutes; FFMPEG codec issues, GPU shader regressions, or asset pipeline failures | Grafana OnCall → `media-oncall` |
| **L3** | Infrastructure lead + Render Service owner | L2 cannot resolve within 60 minutes; persistent OOM kills, storage bottleneck, or cluster capacity exhausted | Slack `#ops-leads` + `#render` → call |
| **L4** | VP Engineering | L3 not reached within 15 minutes; user-facing impact (users cannot export) exceeds 1 hour | Phone tree |

### Escalation timeline
- **15 minutes** — L1 acknowledges and posts situation report to `#ops-incidents`.
- **30 minutes** — Escalate to L2 if no clear root cause identified.
- **60 minutes** — Escalate to L3 if failure rate exceeds 20% or queue remains above 200.
- **90 minutes** — If export capability is still degraded, declare a major incident. Engage Incident Commander.
- **120 minutes** — Public status page update (`status.lazynext.io`) if user-facing.

### Communication template for `#ops-incidents`
```
RENDER INCIDENT | <severity> | <start-time UTC>
Queue: <queued jobs> | Failure rate: <X%> | Workers: <N>
Suspected cause: <brief description>
Actions taken: <list>
Next update: <time>
```

## Post-Incident Checklist

1. [ ] **Drain the backlog** — Verify the render queue has returned to its baseline depth (< 10 jobs queued).
2. [ ] **Validate output quality** — Spot-check the last 5 completed renders for visual artifacts, audio sync issues, or truncation.
3. [ ] **Restore configuration** — Revert any temporary config changes (disabled formats, increased HPA max, resource overrides).
4. [ ] **Run the render integration test suite**:
   ```bash
   cd /Users/avaspatel/Lazynext
   bun run test:e2e -- --grep "render"
   ```
5. [ ] **Capture evidence** — Attach to the incident ticket:
   - Grafana dashboard screenshots (Render Service Overview, Worker Health).
   - Render service logs for the incident window.
   - Sample failed job metadata (IDs, input composition specs, error messages).
   - `kubectl describe` output for any worker pods that were OOM-killed or restarted.
6. [ ] **Root cause analysis** — Draft RCA within 24 hours. Common patterns to investigate:
   - New encoding preset regression.
   - Upstream asset pipeline change (larger/unoptimized inputs).
   - Infrastructure change (storage tier downgrade, network policy).
   - Codec-specific bug triggered by composition complexity.
7. [ ] **Action items** — Create tickets with owners and due dates:
   - Code/provisioning fix.
   - Improved FFMPEG stall detection / auto-retry.
   - Worker resource tuning.
   - Additional e2e test coverage for the failure scenario.
8. [ ] **Update runbook** — If new diagnostic queries or mitigation tactics were discovered, reflect them here.
9. [ ] **SLO review** — Calculate error budget consumed. If budget is exhausted, enforce the deploy freeze gate for the render pipeline.
10. [ ] **Postmortem** — Schedule within 5 business days for severity-1 incidents. Distribute to the engineering team.

## Appendix: Expected Duration Calculation

The render service estimates job duration using this formula (implemented in `services/render-service/src/estimator.ts`):

```
estimated_seconds = (composition_duration_seconds * codec_factor * resolution_factor * effects_factor) / worker_calibration_score
```

Where:
- `codec_factor`: 1.0 (MP4/H.264), 2.5 (ProRes), 4.0 (DCP/JPEG2000)
- `resolution_factor`: `(output_width * output_height) / (1920 * 1080)`
- `effects_factor`: `1.0 + (0.15 * num_blend_modes) + (0.25 * num_gpu_effects)`
- `worker_calibration_score`: Recalibrated weekly from the median throughput of all workers

## References
- Render Service source: `/Users/avaspatel/Lazynext/services/render-service/`
- FFMPEG encoding pipeline (Rust): `/Users/avaspatel/Lazynext/rust/crates/export/`
- Kubernetes manifests: `/Users/avaspatel/Lazynext/k8s/`
- Render service estimator implementation: `services/render-service/src/estimator.ts`
