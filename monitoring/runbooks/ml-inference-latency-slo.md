# Runbook: MLInferenceLatencySLO

**Alert:** `MLInferenceLatencySLO`
**SLO:** p95 ML inference latency < 5 minutes
**Services:** `lazynext-pre-processing`, `lazynext-generative-studio`
**Severity:** warning

## Meaning

This alert fires when the 95th percentile of ML inference requests (transcription,
rotoscoping, video generation, dubbing, etc.) exceeds 5 minutes over a 1-hour window.

## Immediate Actions (5 min)

1. **Identify which ML service is slow** — Check the Grafana "ML Service Latency (p95)"
   panel. The legend will show which service (`pre-processing` or `generative-studio`)
   is breaching the SLO.
2. **Check service health:**
   ```bash
   kubectl exec -n lazynext deploy/lazynext-pre-processing -- curl -s http://localhost:8000/
   kubectl exec -n lazynext deploy/lazynext-generative-studio -- curl -s http://localhost:8001/
   ```
3. **Check GPU availability** (if GPU variant is deployed):
   ```bash
   kubectl describe nodes -l nvidia.com/gpu=true | grep -A5 "Allocated resources"
   ```

## Common Causes & Remediation

### 1. GPU node unavailable (GPU variant)
- **Symptom:** Jobs queue up, GPU utilization is 0% or pods stuck in Pending
- **Fix:** Check GPU node pool status:
  ```bash
  az aks nodepool show --cluster-name lazynext-aks-prod --name gpunp --resource-group lazynext-rg-prod
  ```
  Scale up if needed: `az aks nodepool scale --cluster-name lazynext-aks-prod --name gpunp --node-count 2 --resource-group lazynext-rg-prod`

### 2. External API rate limiting (Modal, Edge TTS)
- **Symptom:** 429 HTTP status codes in logs, latency spikes
- **Fix:** Check API dashboard on provider's website. Consider enabling
  fallback to local models if API is consistently rate-limited.

### 3. Model cold start
- **Symptom:** First request after deploy/idle takes 5-10x normal time
- **Fix:** The model-warmup CronJob should handle this. Check if it ran:
  ```bash
  kubectl get cronjob model-warmup -n lazynext
  kubectl logs job/model-warmup-once -n lazynext
  ```

### 4. Memory pressure / OOM
- **Symptom:** Pods restarting, OOMKilled in pod status
- **Fix:** Increase memory limits or adjust batch size:
  ```bash
  kubectl edit deploy lazynext-generative-studio -n lazynext
  # Increase memory limits from 8Gi to 16Gi
  ```

## Escalation

- **15 minutes:** ML platform team lead
- **30 minutes:** CTO (AI features are core product differentiator)
- **If all ML services are down:** Trigger Grafana OnCall for on-call ML engineer

## Post-Incident

1. Create incident doc in `/docs/incidents/YYYY-MM-DD-ml-latency.md`
2. Document which specific endpoint(s) were slow and why
3. Update model warmup or resource limits as needed
4. Consider adding per-endpoint SLOs for the most critical ML operations
