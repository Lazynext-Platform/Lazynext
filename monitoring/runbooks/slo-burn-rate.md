# SLO Burn Rate Alert — Runbook

## Alert: `SLOBurnRateCritical` / `SLOBurnRateWarning`

**Severity**: Critical (14.4x burn rate) / Warning (6x burn rate)
**Service**: Lazynext Web App
**SLO**: 99.9% availability (43m 50s max downtime/month)

## What This Means

The error budget for the web application is being consumed faster than expected.

- **14.4x burn rate**: Will exhaust the entire month's error budget in ~1 hour
- **6x burn rate**: Will exhaust the budget in ~6 hours

## Immediate Actions (5 min)

1. **Check the Grafana dashboard**: [Lazynext Overview](https://monitoring.lazynext.ai/d/lazynext-overview)
2. **Check recent deployments**: `kubectl rollout history deployment/lazynext-web -n lazynext`
3. **Check Cloud Run logs**: Open Cloud Logging → filter for 5xx errors
4. **Database connectivity**: Run `scripts/health-check.sh` from the repo root

## Common Causes

### Recent Deployment
```bash
# Rollback if deployed in last 10 minutes
kubectl rollout undo deployment/lazynext-web -n lazynext
```

### Database Connection Pool Exhausted
```bash
# Check PgBouncer stats
curl -s http://pgbouncer:6432/stats | grep -E "total_|active_|waiting"

# Restart PgBouncer if stuck
kubectl rollout restart deployment/lazynext-pgbouncer -n lazynext
```

### Cloud SQL Overload
```bash
# Check active connections
gcloud sql databases describe lazynext --instance=lazynext-db-prod

# Restart if absolutely necessary (last resort)
gcloud sql instances restart lazynext-db-prod
```

### API Key Expired (Stripe/Resend/OpenAI)
```bash
# Verify secrets
kubectl get secret lazynext-secrets -n lazynext -o jsonpath='{.data}'
# Check each base64-decoded value hasn't expired
```

## Escalation

- **15 min without resolution**: Escalate to platform team lead
- **30 min without resolution**: Escalate to CTO
- **Error budget > 50% consumed**: Implement temporary read-only mode via feature flag

## Post-Incident

1. Create incident document in `/docs/incidents/YYYY-MM-DD-burn-rate.md`
2. Calculate actual downtime and error budget consumed
3. Identify root cause and add to [Postmortem Tracker](https://github.com/Lazynext-Platform/Lazynext/issues?q=label%3Apostmortem)
