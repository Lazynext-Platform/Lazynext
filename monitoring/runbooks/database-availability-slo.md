# Runbook: DatabaseAvailabilitySLO

**Alert:** `DatabaseAvailabilitySLO`
**SLO:** 99.95% database availability (22 min max downtime/month)
**Severity:** critical

## Meaning

This alert fires when the 30-day rolling average of `pg_up` falls below 0.9995,
indicating the database has been unavailable beyond the error budget.
This is the most severe infrastructure alert — database downtime affects ALL services.

## Immediate Actions (5 min)

1. **Verify database is actually down:**
   ```bash
   kubectl exec -n lazynext deploy/lazynext-web -- pg_isready -h postgres-db -U lazynext -d lazynext
   ```
2. **Check PostgreSQL pod status:**
   ```bash
   kubectl get pods -n lazynext -l app=postgres-db
   kubectl describe pod -n lazynext -l app=postgres-db
   ```
3. **Check PostgreSQL logs:**
   ```bash
   kubectl logs -n lazynext -l app=postgres-db --tail=100
   ```
4. **Check disk space:**
   ```bash
   kubectl exec -n lazynext statefulset/postgres-db -- df -h /var/lib/postgresql/data
   ```

## Common Causes & Remediation

### 1. PostgreSQL crashed / OOMKilled
- **Symptom:** Pod in CrashLoopBackOff, OOMKilled in status
- **Fix:**
  ```bash
  # Increase memory limits
  kubectl patch statefulset postgres-db -n lazynext -p '{"spec":{"template":{"spec":{"containers":[{"name":"postgres","resources":{"limits":{"memory":"4Gi"}}}]}}}}'
  # Restart
  kubectl rollout restart statefulset postgres-db -n lazynext
  ```

### 2. Disk full
- **Symptom:** PostgreSQL won't start, "No space left on device" in logs
- **Fix:**
  ```bash
  # Expand PVC (if storage class supports it)
  kubectl patch pvc postgres-data-postgres-db-0 -n lazynext -p '{"spec":{"resources":{"requests":{"storage":"100Gi"}}}}'
  # Run VACUUM FULL if disk was filled by dead tuples
  ```

### 3. Too many connections
- **Symptom:** "too many clients" in PostgreSQL logs, connection pool exhausted
- **Fix:**
  ```bash
  # Kill idle connections
  kubectl exec -n lazynext statefulset/postgres-db -- psql -U lazynext -d lazynext -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND age(now(), query_start) > interval '10 minutes';"
  ```

### 4. Cloud SQL-specific (if using Cloud SQL instead)
- **Symptom:** Instance not reachable via Cloud SQL proxy
- **Fix:**
  ```bash
  gcloud sql instances describe lazynext-postgres-prod
  gcloud sql instances restart lazynext-postgres-prod
  ```

### 5. Replication lag (production with read replicas)
- **Symptom:** Replica lag > 30s
- **Fix:**
  ```bash
  kubectl exec -n lazynext statefulset/postgres-db -- psql -U lazynext -d lazynext -c \
    "SELECT application_name, state, sync_state, replay_lag FROM pg_stat_replication;"
  ```

## Escalation

- **5 minutes:** DBA on-call (PagerDuty)
- **10 minutes:** Platform team lead
- **15 minutes:** CTO
- **If database is unrecoverable:** Initiate point-in-time recovery (PITR) from
  latest backup using `scripts/pitr-restore.sh`

## Post-Incident

1. Create incident doc in `/docs/incidents/YYYY-MM-DD-database-outage.md`
2. Calculate actual downtime and verify against SLA
3. Determine if backup/PITR process worked correctly
4. If caused by application query, add query to the slow-query log analyzer
5. Review connection pooling settings (PgBouncer) and max_connections
