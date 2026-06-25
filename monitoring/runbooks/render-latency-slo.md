# Runbook: RenderLatencySLO

**Alert:** `RenderLatencySLO`
**SLO:** p95 render latency < 30 minutes
**Severity:** warning

## Meaning

This alert fires when the 95th percentile of render job duration exceeds 30 minutes
over a 1-hour window. The SLO is breached when the burn rate indicates the error
budget will be exhausted.

## Immediate Actions (5 min)

1. **Check Grafana dashboard** — Open the Lazynext Overview dashboard, check the
   "Render Queue Size" stat panel and "Render Latency" graph.
2. **Check render queue** — SSH into the render service or use `kubectl`:
   ```bash
   kubectl exec -n lazynext deploy/lazynext-render -- curl -s http://localhost:8003/health
   ```
3. **Check running renders** — Look for stuck or zombie ffmpeg processes:
   ```bash
   kubectl exec -n lazynext deploy/lazynext-render -- ps aux | grep ffmpeg
   ```

## Common Causes & Remediation

### 1. Large or complex timeline exports
- **Symptom:** Queue size growing, individual job durations increasing
- **Fix:** Scale up render workers: `kubectl scale deploy/lazynext-render -n lazynext --replicas=5`

### 2. FFmpeg hung or crashed
- **Symptom:** Jobs stuck in "running" state, no progress updates
- **Fix:** Restart the render service deployment:
  ```bash
  kubectl rollout restart deploy/lazynext-render -n lazynext
  ```

### 3. Storage backend slow (S3/GCS)
- **Symptom:** Render completes but upload to storage is slow
- **Fix:** Check cloud provider status. If Azure Blob, run:
  ```bash
  az storage blob list --container-name media --account-name $(AZURE_STORAGE_ACCOUNT) --auth-mode login
  ```

### 4. CPU throttling / resource exhaustion
- **Symptom:** High CPU throttling in Grafana, OOMKilled events
- **Fix:** Increase resource limits in the render deployment, or check
  Node pressure conditions: `kubectl describe nodes | grep -A5 "Conditions"`

## Escalation

- **15 minutes:** Platform team lead
- **30 minutes:** Engineering manager
- **If render backlog exceeds 100 jobs:** Implement manual queue drain via
  `kubectl exec deploy/lazynext-render -- curl -X POST http://localhost:8003/pause`

## Post-Incident

1. Create incident doc in `/docs/incidents/YYYY-MM-DD-render-latency.md`
2. Calculate actual downtime and error budget consumed
3. Identify root cause and add to postmortem tracker
4. If caused by specific project/export format, add it to the test suite
