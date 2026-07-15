# SLO Runbook: Database Availability

## Service
PostgreSQL 17 (Docker) — primary datastore for all Lazynext microservices and the web application.

## SLO Target
- **Objective**: 99.95% availability (measured over a 30-day rolling window).
- **Definition**: The database is considered available when it accepts TCP connections on port 5432 and returns a successful result to `SELECT 1` within 5 seconds.
- **Excluded from SLO**: Scheduled maintenance windows announced at least 48 hours in advance via the `#ops-announcements` Slack channel.

## Alert Triggers

| Alert Name | Severity | Condition | Prometheus Rule `for` |
|---|---|---|---|
| `DatabaseDown` | Critical | `pg_up == 0` | 1m |
| `DatabaseConnectionExhaustion` | Critical | `pg_stat_database_numbackends / pg_settings_max_connections > 0.90` | 5m |
| `DatabaseHighErrorRate` | Warning | `rate(pg_stat_database_xact_rollback[5m]) / rate(pg_stat_database_xact_commit[5m]) > 0.05` | 10m |
| `DatabaseReplicationLag` | Warning | `pg_stat_replication_flush_lag_bytes > 1_000_000_000` (1 GB) | 10m |
| `DatabaseSlowQueries` | Warning | `histogram_quantile(0.95, rate(pg_stat_statements_query_duration_seconds_bucket[5m])) > 2` | 10m |
| `DatabaseDiskNearFull` | Critical | `pg_stat_database_size_bytes / linode_postgresql_storage_limit_bytes > 0.85` | 5m |
| `DatabaseSLOBurnRate` | Critical | Multi-burn-rate alert on `pg_up == 0`: 14.4x for 1h window OR 6x for 6h window | — |

## Prometheus Queries

### Check current availability
```promql
# Is the database accepting connections right now?
pg_up{job="linode-postgresql",server=~"lazynext-.*"}
```

### Connection pool saturation
```promql
# Ratio of active connections to max connections
pg_stat_database_numbackends{datname="lazynext"}
  / on(instance) group_left
pg_settings_max_connections
```

### Active connection count by application
```promql
# See which application is consuming the most connections
pg_stat_activity_count{datname="lazynext"} by (application_name)
```

### Query performance (p95 latency)
```promql
# P95 query latency over the last 5 minutes
histogram_quantile(0.95,
  rate(pg_stat_statements_query_duration_seconds_bucket{datname="lazynext"}[5m])
)
```

### Transaction error rate
```promql
# Rollback ratio — elevated values indicate constraint violations or deadlocks
rate(pg_stat_database_xact_rollback{datname="lazynext"}[5m])
  /
rate(pg_stat_database_xact_commit{datname="lazynext"}[5m])
```

### Replication lag
```promql
# Bytes the standby is behind the primary
pg_stat_replication_flush_lag_bytes{datname="lazynext"}
```

### Disk utilization
```promql
# Percentage of provisioned storage consumed
pg_stat_database_size_bytes{datname="lazynext"}
  / on(job) group_left
linode_postgresql_storage_limit_bytes
```

### SLO burn rate (error budget consumption)
```promql
# 1-hour burn rate window
sum(rate(pg_up{job="linode-postgresql"} == 0)[1h]))
  / (1 - 0.9995)   # 14.4x burn rate threshold

# 6-hour burn rate window
sum(rate(pg_up{job="linode-postgresql"} == 0)[6h]))
  / (1 - 0.9995)   # 6x burn rate threshold
```

## Diagnostic Steps

### Step 1 — Triage the alert
1. Open the Linode Dashboard → the `lazynext-prod` instance.
2. Check the **Metrics** panel: CPU percent, memory percent, storage percent, IO percent, active connections.
3. Check system logs for auto-detected issues (`journalctl` / Docker logs).
4. Note the time the alert fired and correlate with recent deployments (check `#deployments` Slack or GitHub Actions history).

### Step 2 — Verify database reachability
```bash
# From any service container or jump host
psql "$DATABASE_URL" -c "SELECT 1"
psql "$DATABASE_URL" -c "SELECT now(), pg_postmaster_start_time(), pg_is_in_recovery()"
```

### Step 3 — Inspect active connections and locks
```sql
-- Count connections by state and application
SELECT state, application_name, count(*)
FROM pg_stat_activity
WHERE datname = 'lazynext'
GROUP BY state, application_name
ORDER BY count(*) DESC;

-- Blocked queries (queries waiting on locks)
SELECT blocked.pid AS blocked_pid,
       blocked.query AS blocked_query,
       blocking.pid AS blocking_pid,
       blocking.query AS blocking_query,
       age(now(), blocked.query_start) AS blocked_duration
FROM pg_stat_activity blocked
JOIN pg_locks blocked_locks ON blocked.pid = blocked_locks.pid
JOIN pg_locks blocking_locks ON blocked_locks.lock_type = blocking_locks.lock_type
  AND blocked_locks.relation = blocking_locks.relation
  AND blocked_locks.pid != blocking_locks.pid
JOIN pg_stat_activity blocking ON blocking_locks.pid = blocking.pid
WHERE NOT blocked_locks.granted
  AND blocked.datname = 'lazynext';

-- Long-running queries (> 30 seconds)
SELECT pid, now() - pg_stat_activity.query_start AS duration,
       query, state
FROM pg_stat_activity
WHERE state != 'idle'
  AND now() - pg_stat_activity.query_start > interval '30 seconds'
  AND datname = 'lazynext'
ORDER BY duration DESC;
```

### Step 4 — Check replication status
```sql
SELECT application_name, state, sync_state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS sent_lag_bytes,
       pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) AS flush_lag_bytes
FROM pg_stat_replication;
```

### Step 5 — Review recent logs
1. SSH into the Linode instance → check **Docker logs** for the PostgreSQL container.
2. Filter for `ERROR`, `FATAL`, `PANIC` around the incident window.
3. Common patterns to look for: `too many clients`, `out of shared memory`, `disk full`, `could not fork new process`, `terminating connection due to administrator command`.

### Step 6 — Check dependent services
1. Verify that the four microservices (`pre-processing`, `generative-studio`, `ai-agents`, `render-service`) and the web app can reach the database.
2. Check each service's health endpoint and logs for database connection errors.

## Mitigation Steps

### Tactic A — Connection exhaustion
1. Identify the service leaking connections via `pg_stat_activity.application_name`.
2. If a single misbehaving pod/replica is the culprit, restart it:
   ```bash
   kubectl rollout restart deployment/<service-name> -n lazynext
   ```
3. If the application connection pool is misconfigured, scale up `max_connections` on the server (edit `postgresql.conf` via SSH), then restart the service with corrected pool size.
4. As a last resort, terminate idle connections:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle in transaction'
     AND now() - state_change > interval '10 minutes'
     AND datname = 'lazynext';
   ```

### Tactic B — Storage full
1. Identify large tables:
   ```sql
   SELECT relname AS table_name,
          pg_size_pretty(pg_total_relation_size(relid)) AS total_size
   FROM pg_catalog.pg_statio_user_tables
   ORDER BY pg_total_relation_size(relid) DESC
   LIMIT 20;
   ```
2. If audit/temp tables are bloated, manually archive and truncate the oldest partitions.
3. Scale storage up via Linode Dashboard (or expand the Docker volume; auto-grow should be enabled; if not, enable it and increase the limit).
4. Run `VACUUM FULL` on bloated tables (requires table lock — schedule a brief maintenance window).

### Tactic C — High query latency
1. Identify the slow query from `pg_stat_statements`:
   ```sql
   SELECT queryid, query, calls, mean_exec_time,
          pg_size_pretty(shared_blks_hit + shared_blks_read) AS total_io
   FROM pg_stat_statements
   WHERE datname = 'lazynext'
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```
2. Run `EXPLAIN (ANALYZE, BUFFERS)` on the slow query to inspect the plan.
3. If missing indexes, create them. If the plan is bad, run `ANALYZE <table>` to refresh statistics.
4. If the query originates from a recent deploy, consider rolling that deploy back.

### Tactic D — Database unreachable / down
1. Check Linode status page for platform-level incidents in the region.
2. If the server status is `Stopped`, start it via SSH (`docker compose up -d db`).
3. If the server is `Starting` and stuck, open a Linode support ticket (Severity A).
4. If the entire region is degraded, initiate cross-region failover to the read replica:
   ```bash
   # SSH to the Linode replica instance and promote it
   ssh user@linode-replica 'sudo -u postgres pg_ctl promote -D /var/lib/postgresql/data'
   ```
   Then update `DATABASE_URL` across all services (update via Docker secrets, then trigger a restart of all Docker Compose services).

### Tactic E — Replication lag (warning threshold)
1. Check if the primary is under heavy write load — throttle non-critical batch jobs.
2. Increase the replica's compute tier temporarily to help it catch up.
3. If lag exceeds 5 GB and is growing, the replica will not be usable for failover; page the DBA on-call.

## Escalation Policy

| Level | Role | When to Escalate | Contact |
|-------|------|-------------------|---------|
| **L1** | On-call engineer (24/7 rotation) | First responder for all database alerts | Grafana OnCall → `db-oncall` |
| **L2** | Database reliability engineer (DRE) | L1 cannot resolve within 30 minutes; connection exhaustion, replication lag, or storage full scenarios | Grafana OnCall → `dba-oncall` |
| **L3** | Infrastructure lead | L2 cannot resolve within 60 minutes; region-level Linode outage; data corruption suspected | Slack `#ops-leads` → call |
| **L4** | VP Engineering | L3 not reached within 15 minutes; user-facing impact exceeds 2 hours; decision to trigger public status page update | Phone tree |

### Escalation triggers by incident duration
- **15 minutes** — L1 acknowledges the alert in Grafana OnCall and posts a brief situation report to `#ops-incidents`.
- **30 minutes** — If unresolved, escalate to L2 (DRE).
- **45 minutes** — If L2 has not acknowledged, page L3 directly.
- **60 minutes** — If no path to resolution exists, declare a major incident and engage the Incident Commander (IC) per the company IRP (Incident Response Plan).
- **120 minutes** — IC decides on public status page update (`status.lazynext.io`).

### Communication cadence
- First update in `#ops-incidents` within 15 minutes.
- Follow-up updates every 30 minutes while the incident is active.
- After resolution, post a brief summary and set expectation for the postmortem timeline.

## Post-Incident Checklist

1. [ ] **Restore monitoring** — Confirm all Prometheus metrics are flowing and alert rules are back to normal state.
2. [ ] **Verify service health** — Run the full integration test suite against the production database:
   ```bash
   cd /Users/avaspatel/Lazynext
   bun run test:e2e
   ```
3. [ ] **Capture evidence** — Collect the following and attach to the incident ticket:
    - Linode Dashboard metrics screenshots for the incident window (CPU, memory, IOPS, connections, storage).
   - PostgreSQL logs for the incident window.
   - Relevant application logs from each microservice.
   - Prometheus alert timeline (from Alertmanager or Grafana).
4. [ ] **Root cause analysis (RCA)** — Draft a preliminary RCA within 24 hours. Use the five-whys template.
5. [ ] **Action items** — Create tickets for each corrective action with clear owners and due dates. Link them to the incident.
6. [ ] **Update playbook** — If new failure modes were discovered, update this runbook.
7. [ ] **SLO review** — Determine if the error budget was breached. If so, calculate the remaining budget and decide whether to freeze risky deploys until budget recovers.
8. [ ] **Postmortem meeting** — Schedule within 5 business days for severity-1 incidents. Invite the on-call engineer, DRE, and affected service owners.
9. [ ] **Postmortem publish** — Publish the postmortem to the internal wiki. Share with the engineering team.
10. [ ] **Verify error budget door** — If error budget was exhausted, ensure the automated deploy gate in CI/CD is blocking non-emergency deployments until budget recovers.

## References
- PostgreSQL 17 documentation: `https://www.postgresql.org/docs/17/`
- Prometheus PostgreSQL exporter: `https://github.com/prometheus-community/postgres_exporter`
- Lazynext Infrastructure Docker Compose: `infra/linode/`
- Multi-burn-rate alert methodology: `https://sre.google/workbook/alerting-on-slos/`
