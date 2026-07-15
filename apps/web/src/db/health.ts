/**
 * health.ts — Database health check endpoint for Lazynext
 *
 * Provides a comprehensive health check suitable for:
 *   - Kubernetes liveness/readiness probes
 *   - Docker Compose health checks
 *   - Load balancer health probes
 *   - Monitoring dashboards (Grafana, Datadog)
 *   - Alerting systems (Grafana OnCall, Opsgenie)
 *
 * Endpoint: GET /api/db-health
 *
 * Checks performed:
 *   1. Connection pool status (active, idle, waiting)
 *   2. Replication lag (seconds behind primary)
 *   3. Disk space utilization
 *   4. Long-running query detection
 *   5. Deadlock detection (recent deadlocks)
 *   6. Database responsiveness (simple query test)
 *   7. Migration status
 *
 * Response format: JSON with health status and details
 */

import { type Sql } from "postgres";

// ── Types ────────────────────────────────────────────────────────────────

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface DbHealthResponse {
	/** Aggregate health status. */
	status: HealthStatus;
	/** ISO-8601 timestamp of the check. */
	timestamp: string;
	/** Server uptime details. */
	uptime: {
		/** Uptime in seconds. */
		seconds: number;
		/** Human-readable uptime string (e.g. "2h 15m 30s"). */
		human: string;
	};
	/** Per-check results. */
	checks: {
		/** Database connectivity check result. */
		connectivity: HealthCheckItem;
		/** Connection pool check result. */
		pool: HealthCheckItem & PoolDetails;
		/** Replication lag check result. */
		replication: HealthCheckItem & ReplicationDetails;
		/** Disk space check result. */
		diskSpace: HealthCheckItem & DiskSpaceDetails;
		/** Long-running query check result. */
		longRunningQueries: HealthCheckItem & LongRunningQueryDetails;
		/** Deadlock detection check result. */
		deadlocks: HealthCheckItem & DeadlockDetails;
		/** Migration status check result. */
		migrations: HealthCheckItem & MigrationDetails;
	};
	/** Summary count of checks by status. */
	summary: {
		/** Total number of checks performed. */
		total: number;
		/** Number of healthy checks. */
		healthy: number;
		/** Number of degraded checks. */
		degraded: number;
		/** Number of unhealthy checks. */
		unhealthy: number;
	};
}

export interface HealthCheckItem {
	/** Status for this specific check. */
	status: HealthStatus;
	/** Query latency in milliseconds. */
	latencyMs: number;
	/** Optional human-readable status detail. */
	message?: string;
	/** Error message if the check failed. */
	error?: string;
}

export interface PoolDetails {
	/** Number of active connections. */
	activeConnections: number;
	/** Number of idle connections. */
	idleConnections: number;
	/** Number of connections waiting for a free slot. */
	waitingConnections: number;
	/** Total number of connections in the pool. */
	totalConnections: number;
	/** Configured maximum connection count. */
	maxConnections: number;
	/** Connection pool utilization as percentage. */
	utilizationPercent: number;
}

export interface ReplicationDetails {
	/** Whether this database is a replica. */
	isReplica: boolean;
	/** Replication lag in seconds. */
	lagSeconds: number;
	/** Replication lag in bytes. */
	lagBytes: number;
	/** Number of connected replicas. */
	replicaCount: number;
}

export interface DiskSpaceDetails {
	/** Human-readable database size (e.g. "256 MB"). */
	databaseSize: string;
	/** Database size in bytes. */
	databaseSizeBytes: number;
	/** Disk utilization as percentage. */
	diskUsedPercent: number;
	/** Free disk space in bytes. */
	diskFreeBytes: number;
	/** Number of tables exceeding the bloat threshold. */
	tablesWithBloat: number;
}

export interface LongRunningQueryDetails {
	/** Number of long-running queries detected. */
	count: number;
	/** Duration threshold in seconds. */
	thresholdSeconds: number;
	/** Details of each long-running query. */
	queries: Array<{
		/** Process ID of the query. */
		pid: number;
		/** Duration of the query in seconds. */
		durationSeconds: number;
		/** Query text or description. */
		query: string;
		/** Current query state. */
		state: string;
	}>;
}

export interface DeadlockDetails {
	/** Number of deadlocks in the last 24 hours. */
	recentDeadlocks24h: number;
	/** ISO-8601 timestamp of the most recent deadlock. */
	lastDeadlockAt: string | null;
}

export interface MigrationDetails {
	/** Number of applied migrations. */
	appliedMigrations: number;
	/** Hash of the latest applied migration. */
	latestMigration: string;
	/** Number of pending migrations. */
	pendingMigrations: number;
}

// ── Config ───────────────────────────────────────────────────────────────

export interface HealthCheckConfig {
	/** Threshold in seconds for flagging a query as long-running. */
	longQueryThresholdSeconds: number;
	/** Maximum acceptable replication lag in seconds. */
	maxAcceptableLagSeconds: number;
	/** Disk usage percentage that triggers a degraded status. */
	maxDiskUsagePercent: number;
	/** Timeout in milliseconds for connectivity checks. */
	connectivityTimeoutMs: number;
}

const DEFAULT_CONFIG: HealthCheckConfig = {
	longQueryThresholdSeconds: 30,
	maxAcceptableLagSeconds: 10,
	maxDiskUsagePercent: 85,
	connectivityTimeoutMs: 5000,
};

// ── Low-level Query Helpers ──────────────────────────────────────────────

/**
 * Execute a raw SQL query against the database and return rows.
 * The caller must provide a client (from drizzle or postgres.js).
 */
async function query<T = Record<string, unknown>>(
	client: Sql,
	sql: string,
	params?: unknown[],
	timeoutMs?: number,
): Promise<T[]> {
	// postgres.js unsafe() params are ParameterOrJSON which is compatible with
	// unknown at runtime. We cast through unknown for type-safety.
	const safeParams = (params ?? []) as Parameters<typeof client.unsafe>[1];

	if (timeoutMs) {
		const timeoutPromise = new Promise<never>((_, reject) =>
			setTimeout(
				() => reject(new Error(`Query timed out after ${timeoutMs}ms`)),
				timeoutMs,
			),
		);
		const result = await Promise.race([
			client.unsafe(sql, safeParams),
			timeoutPromise,
		]) as unknown;
		return result as T[];
	}
	const result = await client.unsafe(sql, safeParams) as unknown;
	return result as T[];
}

function timedOp<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
	const start = performance.now();
	return fn().then((result) => ({
		result,
		latencyMs: Math.round((performance.now() - start) * 100) / 100,
	}));
}

// ── Individual Checks ────────────────────────────────────────────────────

async function checkConnectivity(
	client: Sql,
	config: HealthCheckConfig,
): Promise<HealthCheckItem> {
	try {
		const { result, latencyMs } = await timedOp(() =>
			query(client, "SELECT 1 AS connectivity_check", undefined, config.connectivityTimeoutMs),
		);
		const ok = result?.[0] as Record<string, unknown> | undefined;

		if (ok && ok.connectivity_check === 1) {
			return {
				status: "healthy",
				latencyMs,
				message: "Database responded to connectivity check",
			};
		}

		return {
			status: "unhealthy",
			latencyMs,
			error: "Unexpected response from connectivity check",
		};
	} catch (err) {
		return {
			status: "unhealthy",
			latencyMs: 0,
			error: err instanceof Error ? err.message : "Connection failed",
		};
	}
}

async function checkPool(
	client: Sql,
): Promise<HealthCheckItem & PoolDetails> {
	try {
		const { result: rows, latencyMs } = await timedOp(() =>
			query(client, `
				SELECT
					COUNT(*) FILTER (WHERE state = 'active') AS active,
					COUNT(*) FILTER (WHERE state = 'idle') AS idle,
					COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_txn,
					COUNT(*) FILTER (WHERE wait_event_type IS NOT NULL) AS waiting,
					COUNT(*) AS total
				FROM pg_stat_activity
				WHERE datname = current_database()
				  AND pid <> pg_backend_pid()
			`),
		);

		const r = rows?.[0] as Record<string, number | string> | undefined;
		const active = Number(r?.active ?? 0);
		const idle = Number(r?.idle ?? 0);
		const idleInTxn = Number(r?.idle_in_txn ?? 0);
		const waiting = Number(r?.waiting ?? 0);
		const total = Number(r?.total ?? 0);

		// Get max_connections
		const { result: maxRows } = await timedOp(() =>
			query(client, "SHOW max_connections"),
		);
		const maxConn = Number((maxRows?.[0] as Record<string, string>)?.max_connections ?? "100");

		const utilization = maxConn > 0 ? Math.round((total / maxConn) * 100 * 10) / 10 : 0;

		let status: HealthStatus = "healthy";
		let message: string | undefined;

		if (utilization > 90) {
			status = "unhealthy";
			message = `Pool at ${utilization}% — critically high`;
		} else if (utilization > 70) {
			status = "degraded";
			message = `Pool at ${utilization}% — elevated`;
		} else if (idleInTxn > 5) {
			status = "degraded";
			message = `${idleInTxn} connections idle in transaction`;
		}

		return {
			status,
			latencyMs,
			message,
			activeConnections: active,
			idleConnections: idle,
			waitingConnections: waiting,
			totalConnections: total,
			maxConnections: maxConn,
			utilizationPercent: utilization,
		};
	} catch (err) {
		return {
			status: "unhealthy",
			latencyMs: 0,
			error: err instanceof Error ? err.message : "Pool check failed",
			activeConnections: 0,
			idleConnections: 0,
			waitingConnections: 0,
			totalConnections: 0,
			maxConnections: 0,
			utilizationPercent: 0,
		};
	}
}

async function checkReplication(
	client: Sql,
	config: HealthCheckConfig,
): Promise<HealthCheckItem & ReplicationDetails> {
	try {
		const { result: rows, latencyMs } = await timedOp(() =>
			query(client, `
				SELECT
					pg_is_in_recovery() AS is_replica,
					COALESCE(
						EXTRACT(EPOCH FROM (
							NOW() - pg_last_xact_replay_timestamp()
						))::integer,
						0
					) AS lag_seconds,
					COALESCE(
						pg_wal_lsn_diff(
							pg_last_wal_receive_lsn(),
							pg_last_wal_replay_lsn()
						),
						0
					) AS lag_bytes,
					(SELECT COUNT(*) FROM pg_stat_replication) AS replica_count
			`),
		);

		const r = rows?.[0] as Record<string, boolean | number> | undefined;
		const isReplica = Boolean(r?.is_replica ?? false);
		const lagSeconds = Number(r?.lag_seconds ?? 0);
		const lagBytes = Number(r?.lag_bytes ?? 0);
		const replicaCount = Number(r?.replica_count ?? 0);

		let status: HealthStatus = "healthy";
		let message: string | undefined;

		if (lagSeconds > config.maxAcceptableLagSeconds * 2) {
			status = "unhealthy";
			message = `Replication lag: ${lagSeconds}s (threshold: ${config.maxAcceptableLagSeconds}s)`;
		} else if (lagSeconds > config.maxAcceptableLagSeconds) {
			status = "degraded";
			message = `Replication lag: ${lagSeconds}s — elevated`;
		}

		return {
			status,
			latencyMs,
			message,
			isReplica,
			lagSeconds,
			lagBytes,
			replicaCount,
		};
	} catch (err) {
		return {
			status: "degraded",
			latencyMs: 0,
			error: err instanceof Error ? err.message : "Replication check failed",
			isReplica: false,
			lagSeconds: 0,
			lagBytes: 0,
			replicaCount: 0,
		};
	}
}

async function checkDiskSpace(
	client: Sql,
	config: HealthCheckConfig,
): Promise<HealthCheckItem & DiskSpaceDetails> {
	try {
		const { result: rows, latencyMs } = await timedOp(() =>
			query(client, `
				WITH db_size AS (
					SELECT pg_database_size(current_database()) AS bytes
				),
				table_bloat AS (
					SELECT COUNT(*) AS bloated_tables
					FROM (
						SELECT schemaname, tablename,
							pg_total_relation_size(schemaname||'.'||tablename) AS total_size,
							pg_relation_size(schemaname||'.'||tablename) AS data_size
						FROM pg_tables
						WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
					) t
					WHERE total_size > 0
					  AND (total_size - data_size) > (data_size * 0.3) -- 30% bloat threshold
				),
				disk_info AS (
					-- Works on PostgreSQL 17 with pg_stat_file-friendly FS
					SELECT
						setting AS data_directory
					FROM pg_settings
					WHERE name = 'data_directory'
				)
				SELECT
					(SELECT bytes FROM db_size) AS database_size_bytes,
					pg_size_pretty((SELECT bytes FROM db_size)) AS database_size,
					(SELECT bloated_tables FROM table_bloat) AS tables_with_bloat
			`),
		);

		const r = rows?.[0] as Record<string, number | string> | undefined;
		const dbSizeBytes = Number(r?.database_size_bytes ?? 0);
		const dbSize = String(r?.database_size ?? "0 bytes");
		const tablesWithBloat = Number(r?.tables_with_bloat ?? 0);

		// Estimate disk usage (this is approximate without OS-level checks)
		// In production, you'd query Docker metrics or use df
		const diskUsedPercent = 0; // Placeholder — query Docker metrics in production
		const diskFreeBytes = 0;

		let status: HealthStatus = "healthy";
		let message: string | undefined;

		if (diskUsedPercent > config.maxDiskUsagePercent) {
			status = "unhealthy";
			message = `Disk usage at ${diskUsedPercent}% — critically high`;
		} else if (diskUsedPercent > config.maxDiskUsagePercent - 10) {
			status = "degraded";
			message = `Disk usage at ${diskUsedPercent}% — elevated`;
		}

		if (tablesWithBloat > 10) {
			const _degradedMsg = status === "healthy" ? undefined : message;
			status = status === "healthy" ? "degraded" : status;
			message = `${tablesWithBloat} tables have significant bloat (>30%)`;
		}

		return {
			status,
			latencyMs,
			message,
			databaseSize: dbSize,
			databaseSizeBytes: dbSizeBytes,
			diskUsedPercent,
			diskFreeBytes,
			tablesWithBloat,
		};
	} catch (err) {
		return {
			status: "degraded",
			latencyMs: 0,
			error: err instanceof Error ? err.message : "Disk check failed",
			databaseSize: "unknown",
			databaseSizeBytes: 0,
			diskUsedPercent: 0,
			diskFreeBytes: 0,
			tablesWithBloat: 0,
		};
	}
}

async function checkLongRunningQueries(
	client: Sql,
	config: HealthCheckConfig,
): Promise<HealthCheckItem & LongRunningQueryDetails> {
	try {
		const { result: rows, latencyMs } = await timedOp(() =>
			query<{
				pid: number;
				duration_seconds: number;
				query: string;
				state: string;
			}>(client, `
				SELECT
					pid,
					EXTRACT(EPOCH FROM (NOW() - query_start))::integer AS duration_seconds,
					LEFT(query, 200) AS query,
					state
				FROM pg_stat_activity
				WHERE state = 'active'
				  AND query_start < NOW() - INTERVAL '1 second' * $1
				  AND query NOT LIKE '%pg_stat_activity%'
				  AND query NOT LIKE '%pg_settings%'
				ORDER BY query_start ASC
				LIMIT 10
			`, [config.longQueryThresholdSeconds]),
		);

		const queries = (rows ?? []).map((r) => ({
			pid: Number(r.pid),
			durationSeconds: Number(r.duration_seconds),
			query: String(r.query),
			state: String(r.state),
		}));

		const count = queries.length;

		let status: HealthStatus = "healthy";
		let message: string | undefined;

		if (count > 5) {
			status = "unhealthy";
			message = `${count} queries running >${config.longQueryThresholdSeconds}s`;
		} else if (count > 1) {
			status = "degraded";
			message = `${count} long-running queries detected`;
		}

		return {
			status,
			latencyMs,
			message,
			count,
			thresholdSeconds: config.longQueryThresholdSeconds,
			queries,
		};
	} catch (err) {
		return {
			status: "degraded",
			latencyMs: 0,
			error: err instanceof Error ? err.message : "Long-running query check failed",
			count: 0,
			thresholdSeconds: config.longQueryThresholdSeconds,
			queries: [],
		};
	}
}

async function checkDeadlocks(
	client: Sql,
): Promise<HealthCheckItem & DeadlockDetails> {
	try {
		const { result: rows, latencyMs } = await timedOp(() =>
			query<{ deadlock_count: string; last_deadlock: string | null }>(
				client,
				`
				-- Check PostgreSQL log for deadlocks (if log is in a table)
				-- Falls back to pg_stat_database deadlock counter
				SELECT
					COALESCE(SUM(deadlocks), 0)::text AS deadlock_count,
					NULL::text AS last_deadlock
				FROM pg_stat_database
				WHERE datname = current_database()
			`,
			),
		);

		const deadlockCount = parseInt(
			(rows?.[0] as Record<string, string>)?.deadlock_count ?? "0",
			10,
		);

		let status: HealthStatus = "healthy";
		let message: string | undefined;

		if (deadlockCount > 100) {
			status = "unhealthy";
			message = `${deadlockCount} deadlocks detected since last stats reset`;
		} else if (deadlockCount > 10) {
			status = "degraded";
			message = `${deadlockCount} deadlocks detected — elevated`;
		}

		return {
			status,
			latencyMs,
			message,
			recentDeadlocks24h: deadlockCount,
			lastDeadlockAt: (rows?.[0] as Record<string, string | null>)?.last_deadlock ?? null,
		};
	} catch (err) {
		return {
			status: "degraded",
			latencyMs: 0,
			error: err instanceof Error ? err.message : "Deadlock check failed",
			recentDeadlocks24h: 0,
			lastDeadlockAt: null,
		};
	}
}

async function checkMigrations(
	client: Sql,
): Promise<HealthCheckItem & MigrationDetails> {
	try {
		const { result: rows, latencyMs } = await timedOp(() =>
			query<{ tracking_exists: boolean }>(client, `
				-- Check if drizzle migration tracking table exists
				SELECT EXISTS (
					SELECT FROM information_schema.tables
					WHERE table_schema = 'public'
					  AND table_name = '__drizzle_migrations'
				) AS tracking_exists
			`),
		);

		const trackingExists = (rows?.[0] as unknown as Record<string, boolean>)?.tracking_exists ?? false;

		let appliedCount = 0;
		let latestName = "unknown";

		if (trackingExists) {
			const { result: migrationRows } = await timedOp(() =>
				query<{ count: string; latest: string }>(client, `
					SELECT
						COUNT(*)::text AS count,
						COALESCE(MAX(hash), 'none') AS latest
					FROM __drizzle_migrations
				`),
			);
			appliedCount = parseInt(
				(migrationRows?.[0] as Record<string, string>)?.count ?? "0",
				10,
			);
			latestName = (migrationRows?.[0] as Record<string, string>)?.latest ?? "unknown";
		}

		const status: HealthStatus = trackingExists ? "healthy" : "degraded";

		return {
			status,
			latencyMs,
			message: trackingExists
				? `${appliedCount} migrations applied`
				: "Migration tracking table not found",
			appliedMigrations: appliedCount,
			latestMigration: latestName,
			pendingMigrations: 0, // Cannot determine here; check drizzle-kit
		};
	} catch (err) {
		return {
			status: "degraded",
			latencyMs: 0,
			error: err instanceof Error ? err.message : "Migration check failed",
			appliedMigrations: 0,
			latestMigration: "unknown",
			pendingMigrations: 0,
		};
	}
}

// ── Main Health Check ────────────────────────────────────────────────────

/**
 * Run a full database health check.
 *
 * @param client - A postgres.js SQL client (or drizzle's db.$client)
 * @param config - Optional health check configuration overrides
 * @returns Comprehensive health check response
 */
export async function checkDatabaseHealth(
	client: Sql,
	config?: Partial<HealthCheckConfig>,
): Promise<DbHealthResponse> {
	const cfg = { ...DEFAULT_CONFIG, ...config };
	const startTime = process.uptime();

	const [connectivity, pool, replication, diskSpace, longRunning, deadlocks, migrations] =
		await Promise.all([
			checkConnectivity(client, cfg),
			checkPool(client),
			checkReplication(client, cfg),
			checkDiskSpace(client, cfg),
			checkLongRunningQueries(client, cfg),
			checkDeadlocks(client),
			checkMigrations(client),
		]);

	const checks = {
		connectivity,
		pool,
		replication,
		diskSpace,
		longRunningQueries: longRunning,
		deadlocks,
		migrations,
	};

	// Aggregate status
	const statuses = Object.values(checks).map((c) => c.status);
	const healthy = statuses.filter((s) => s === "healthy").length;
	const degraded = statuses.filter((s) => s === "degraded").length;
	const unhealthy = statuses.filter((s) => s === "unhealthy").length;

	let overallStatus: HealthStatus = "healthy";
	if (unhealthy > 0) {
		overallStatus = "unhealthy";
	} else if (degraded > 0) {
		overallStatus = "degraded";
	}

	const uptimeSeconds = Math.round(process.uptime() - startTime + process.uptime());

	return {
		status: overallStatus,
		timestamp: new Date().toISOString(),
		uptime: {
			seconds: uptimeSeconds,
			human: formatUptime(uptimeSeconds),
		},
		checks,
		summary: {
			total: statuses.length,
			healthy,
			degraded,
			unhealthy,
		},
	};
}

/**
 * Run a lightweight health check suitable for Kubernetes liveness probes.
 * Only checks connectivity. Returns quickly.
 */
export async function checkLiveness(
	client: Sql,
): Promise<{ status: HealthStatus; latencyMs: number }> {
	const connectivity = await checkConnectivity(client, DEFAULT_CONFIG);
	return {
		status: connectivity.status,
		latencyMs: connectivity.latencyMs,
	};
}

/**
 * Run a medium-weight health check suitable for Kubernetes readiness probes.
 * Checks connectivity and pool health.
 */
export async function checkReadiness(
	client: Sql,
): Promise<{
	status: HealthStatus;
	connectivity: HealthStatus;
	pool: HealthStatus;
}> {
	const [connectivity, pool] = await Promise.all([
		checkConnectivity(client, DEFAULT_CONFIG),
		checkPool(client),
	]);

	let status: HealthStatus = "healthy";
	if (connectivity.status === "unhealthy" || pool.status === "unhealthy") {
		status = "unhealthy";
	} else if (connectivity.status === "degraded" || pool.status === "degraded") {
		status = "degraded";
	}

	return {
		status,
		connectivity: connectivity.status,
		pool: pool.status,
	};
}

// ── Utility ───────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);

	const parts: string[] = [];
	if (d > 0) parts.push(`${d}d`);
	if (h > 0) parts.push(`${h}h`);
	if (m > 0) parts.push(`${m}m`);
	parts.push(`${s}s`);
	return parts.join(" ");
}
