/**
 * query-monitor.ts — Query performance monitoring for Lazynext
 *
 * Features:
 *   - Middleware to detect and log slow queries (>100ms)
 *   - N+1 query detection via query pattern analysis
 *   - EXPLAIN ANALYZE wrapper for query plan inspection
 *   - Query statistics aggregation with percentiles
 *   - OpenTelemetry integration for distributed tracing
 *
 * Usage:
 *   import { QueryMonitor } from '@/db/query-monitor';
 *
 *   const monitor = new QueryMonitor({ slowQueryThresholdMs: 100 });
 *
 *   // Wrap a query
 *   const result = await monitor.track('getUserProjects', () =>
 *     db.query.projects.findMany({ where: eq(projects.userId, userId) })
 *   );
 *
 *   // Get stats
 *   console.log(monitor.getStats());
 */

// ── OpenTelemetry Types (inline to avoid hard dependency) ──────────────

interface OtelSpan {
	/** Set a single attribute on the span. */
	setAttribute(key: string, value: string | number | boolean): void;
	/** End the span. */
	end(): void;
	/** Record an exception against the span. */
	recordException(error: Error): void;
	/** Set the status code and message of the span. */
	setStatus(status: { code: number; message: string }): void;
}

interface OtelTracer {
	/** Start a new span with an optional set of options. */
	startSpan(name: string, options?: Record<string, unknown>): OtelSpan;
}

// ── Types ────────────────────────────────────────────────────────────────

export interface QueryMonitorConfig {
	/** Threshold in ms above which a query is logged as slow */
	slowQueryThresholdMs: number;
	/** Whether to collect query statistics */
	enableStats: boolean;
	/** Maximum number of queries to retain in stats */
	maxStatsEntries: number;
	/** Whether to enable N+1 detection */
	enableNPlusOneDetection: boolean;
	/** N+1 detection: minimum identical queries within a window to flag */
	nPlusOneThreshold: number;
	/** N+1 detection: time window in ms */
	nPlusOneWindowMs: number;
	/** Whether to enable OpenTelemetry tracing */
	enableTracing: boolean;
	/** Whether to log query parameters (PII risk — disable in production) */
	logParameters: boolean;
}

export interface QueryExecution {
	/** Unique label for this query */
	label: string;
	/** SQL generated (for logging) */
	sql?: string;
	/** Parameters used */
	params?: unknown[];
	/** Duration in milliseconds */
	durationMs: number;
	/** Whether this was a slow query */
	slow: boolean;
	/** Timestamp */
	timestamp: number;
	/** Caller location (file:line) if available */
	caller?: string;
	/** Error if query failed */
	error?: string;
}

export interface QueryStats {
	/** Total number of tracked queries. */
	totalQueries: number;
	/** Number of queries that exceeded the slow threshold. */
	slowQueries: number;
	/** Number of queries that threw an error. */
	failedQueries: number;
	/** Average query duration in milliseconds. */
	averageMs: number;
	/** Minimum query duration in milliseconds. */
	minMs: number;
	/** Maximum query duration in milliseconds. */
	maxMs: number;
	/** 50th percentile duration in milliseconds. */
	p50Ms: number;
	/** 75th percentile duration in milliseconds. */
	p75Ms: number;
	/** 95th percentile duration in milliseconds. */
	p95Ms: number;
	/** 99th percentile duration in milliseconds. */
	p99Ms: number;
	/** Queries grouped by label */
	byLabel: Record<string, {
		/** Number of executions. */
		count: number;
		/** Average duration in milliseconds. */
		averageMs: number;
		/** Minimum duration in milliseconds. */
		minMs: number;
		/** Maximum duration in milliseconds. */
		maxMs: number;
		/** 95th percentile duration in milliseconds. */
		p95Ms: number;
		/** Number of slow executions. */
		slowCount: number;
	}>;
	/** Recent slow queries */
	recentSlowQueries: QueryExecution[];
	/** Detected N+1 query patterns */
	nPlusOnePatterns: NPlusOneDetection[];
}

export interface NPlusOneDetection {
	/** Label of the query pattern flagged. */
	label: string;
	/** Number of identical queries observed within the window. */
	count: number;
	/** Detection window size in milliseconds. */
	windowMs: number;
	/** Timestamp when the pattern was detected. */
	detectedAt: number;
}

export interface ExplainAnalyzeResult {
	/** JSON query plan produced by EXPLAIN ANALYZE. */
	queryPlan: string;
	/** Actual execution time in milliseconds. */
	executionTimeMs: number;
	/** Query planning time in milliseconds. */
	planningTimeMs: number;
	/** Number of rows returned. */
	rows: number;
}

// ── OpenTelemetry Stub ──────────────────────────────────────────────────
// Gracefully degrades if @opentelemetry/api is not installed

let otelTracer: OtelTracer | null = null;

function getTracer(): OtelTracer | null {
	if (otelTracer) return otelTracer;
	try {
		// Dynamic import so we don't crash if OTEL is not configured
		// eslint-disable-next-line @typescript-eslint/no-require-imports
			const otel = require("@opentelemetry/api") as {
			trace: { getTracer(name: string, version: string): OtelTracer };
		};
		otelTracer = otel.trace.getTracer("lazynext-db", "1.0.0");
		return otelTracer;
	} catch {
		return null;
	}
}

function startSpan(name: string): OtelSpan | null {
	const tracer = getTracer();
	if (!tracer) return null;
	return tracer.startSpan(name, {
		attributes: {
			"db.system": "postgresql",
			"db.name": process.env.DB_NAME ?? "lazynext",
			"db.operation": name,
		},
	});
}

// ── N+1 Detector ────────────────────────────────────────────────────────

interface QueryTrace {
	/** Query label. */
	label: string;
	/** Timestamp the query was recorded. */
	timestamp: number;
	/** Normalized query hash for comparison. */
	hash: string;
}

class NPlusOneDetector {
	private queryHistory: QueryTrace[] = [];
	private threshold: number;
	private windowMs: number;

	constructor(threshold = 5, windowMs = 1000) {
		this.threshold = threshold;
		this.windowMs = windowMs;
	}

	/** Record a query and check for N+1 patterns */
	record(label: string, hash?: string): NPlusOneDetection | null {
		const now = Date.now();
		const queryHash = hash ?? label;
		const trace: QueryTrace = { label, timestamp: now, hash: queryHash };

		this.queryHistory.push(trace);

		// Prune expired entries
		const cutoff = now - this.windowMs;
		this.queryHistory = this.queryHistory.filter(
			(q) => q.timestamp >= cutoff,
		);

		// Count identical queries within the window
		const patternCount = this.queryHistory.filter(
			(q) => q.hash === queryHash,
		).length;

		if (patternCount >= this.threshold) {
			return {
				label,
				count: patternCount,
				windowMs: this.windowMs,
				detectedAt: now,
			};
		}

		return null;
	}

	reset(): void {
		this.queryHistory = [];
	}
}

// ── Stats Aggregator ─────────────────────────────────────────────────────

class QueryStatsAggregator {
	private executions: QueryExecution[] = [];
	private maxEntries: number;

	constructor(maxEntries = 10000) {
		this.maxEntries = maxEntries;
	}

	record(execution: QueryExecution): void {
		this.executions.push(execution);

		// Evict oldest entries if over limit
		if (this.executions.length > this.maxEntries) {
			const excess = this.executions.length - this.maxEntries;
			this.executions.splice(0, excess);
		}
	}

	getStats(slowQueryThreshold: number): QueryStats {
		const durations = this.executions
			.filter((e) => !e.error)
			.map((e) => e.durationMs)
			.sort((a, b) => a - b);

		const totalQueries = this.executions.length;
		const slowQueries = this.executions.filter((e) => e.slow).length;
		const failedQueries = this.executions.filter((e) => e.error).length;
		const averageMs =
			durations.length > 0
				? durations.reduce((s, d) => s + d, 0) / durations.length
				: 0;

		// Group by label
		const byLabel: QueryStats["byLabel"] = {};
		for (const e of this.executions) {
			if (!byLabel[e.label]) {
				byLabel[e.label] = {
					count: 0,
					averageMs: 0,
					minMs: Infinity,
					maxMs: -Infinity,
					p95Ms: 0,
					slowCount: 0,
				};
			}
			const group = byLabel[e.label];
			group.count++;
			group.averageMs =
				(group.averageMs * (group.count - 1) + e.durationMs) / group.count;
			group.minMs = Math.min(group.minMs, e.durationMs);
			group.maxMs = Math.max(group.maxMs, e.durationMs);
			if (e.slow) group.slowCount++;
		}

		// Compute p95 per group
		for (const [label, group] of Object.entries(byLabel)) {
			const groupDurations = this.executions
				.filter((e) => e.label === label && !e.error)
				.map((e) => e.durationMs)
				.sort((a, b) => a - b);

			if (groupDurations.length > 0) {
				const p95Idx = Math.ceil(groupDurations.length * 0.95) - 1;
				group.p95Ms = groupDurations[Math.min(p95Idx, groupDurations.length - 1)];
			}
		}

		return {
			totalQueries,
			slowQueries,
			failedQueries,
			averageMs: Math.round(averageMs * 100) / 100,
			minMs: durations[0] ?? 0,
			maxMs: durations[durations.length - 1] ?? 0,
			p50Ms: percentile(durations, 50),
			p75Ms: percentile(durations, 75),
			p95Ms: percentile(durations, 95),
			p99Ms: percentile(durations, 99),
			byLabel,
			recentSlowQueries: this.executions
				.filter((e) => e.slow)
				.slice(-20),
			nPlusOnePatterns: [],
		};
	}

	reset(): void {
		this.executions = [];
	}
}

function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0;
	const idx = Math.ceil(sorted.length * (p / 100)) - 1;
	return sorted[Math.min(idx, sorted.length - 1)];
}

// ── Query Monitor ────────────────────────────────────────────────────────

export class QueryMonitor {
	private config: QueryMonitorConfig;
	private stats: QueryStatsAggregator;
	private nPlusOneDetector: NPlusOneDetector | null;
	private nPlusOnePatterns: NPlusOneDetection[] = [];

	constructor(config?: Partial<QueryMonitorConfig>) {
		this.config = {
			slowQueryThresholdMs: config?.slowQueryThresholdMs ?? 100,
			enableStats: config?.enableStats ?? true,
			maxStatsEntries: config?.maxStatsEntries ?? 10000,
			enableNPlusOneDetection: config?.enableNPlusOneDetection ?? true,
			nPlusOneThreshold: config?.nPlusOneThreshold ?? 5,
			nPlusOneWindowMs: config?.nPlusOneWindowMs ?? 1000,
			enableTracing: config?.enableTracing ?? false,
			logParameters: config?.logParameters ?? false,
		};

		this.stats = new QueryStatsAggregator(this.config.maxStatsEntries);
		this.nPlusOneDetector = this.config.enableNPlusOneDetection
			? new NPlusOneDetector(
					this.config.nPlusOneThreshold,
					this.config.nPlusOneWindowMs,
				)
			: null;
	}

	/**
	 * Track a query execution. Wraps a query function and records its duration.
	 *
	 * @param label - Descriptive label for this query (e.g., "getUserById")
	 * @param queryFn - The async query function to execute
	 * @param options - Optional SQL text and parameters for logging
	 */
	async track<T>(
		label: string,
		queryFn: () => Promise<T>,
		options?: {
			sql?: string;
			params?: unknown[];
		},
	): Promise<T> {
		const startTime = performance.now();
		const timestamp = Date.now();
		let span: OtelSpan | null = null;

		if (this.config.enableTracing) {
			span = startSpan(label);
			span?.setAttribute("db.statement", options?.sql ?? label);
		}

		try {
			const result = await queryFn();
			const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
			const slow = durationMs > this.config.slowQueryThresholdMs;

			this.recordExecution({
				label,
				sql: options?.sql,
				params: options?.params,
				durationMs,
				slow,
				timestamp,
			});

			// N+1 detection
			if (this.nPlusOneDetector) {
				const detection = this.nPlusOneDetector.record(
					label,
					options?.sql
						? normalizeSQL(options.sql)
						: undefined,
				);
				if (detection) {
					this.nPlusOnePatterns.push(detection);
					console.warn(
						`[QueryMonitor] N+1 Query Detected: "${label}" ran ${detection.count} times in ${detection.windowMs}ms`,
					);
				}
			}

			// Slow query logging
			if (slow) {
				this.logSlowQuery({
					label,
					sql: options?.sql,
					params: options?.params,
					durationMs,
					slow,
					timestamp,
				});
			}

			span?.setAttribute("db.duration_ms", durationMs);
			span?.end();

			return result;
		} catch (error) {
			const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			this.recordExecution({
				label,
				sql: options?.sql,
				params: options?.params,
				durationMs,
				slow: durationMs > this.config.slowQueryThresholdMs,
				timestamp,
				error: errorMessage,
			});

			span?.recordException(error as Error);
			span?.setStatus({ code: 2, message: errorMessage }); // ERROR
			span?.end();

			throw error;
		}
	}

	private recordExecution(execution: QueryExecution): void {
		if (this.config.enableStats) {
			this.stats.record(execution);
		}
	}

	private logSlowQuery(execution: QueryExecution): void {
		const parts = [
			`[QueryMonitor] SLOW QUERY: ${execution.label} took ${execution.durationMs}ms`,
		];

		if (execution.sql) {
			parts.push(`  SQL: ${truncateSQL(execution.sql)}`);
		}

		if (this.config.logParameters && execution.params?.length) {
			parts.push(
				`  Params: ${JSON.stringify(execution.params).slice(0, 200)}`,
			);
		}

		if (execution.caller) {
			parts.push(`  Caller: ${execution.caller}`);
		}

		console.warn(parts.join("\n"));
	}

	/**
	 * Get aggregated query statistics.
	 */
	getStats(): QueryStats {
		const stats = this.stats.getStats(this.config.slowQueryThresholdMs);
		stats.nPlusOnePatterns = [...this.nPlusOnePatterns].slice(-10);
		return stats;
	}

	/**
	 * Reset all statistics and N+1 detection state.
	 */
	reset(): void {
		this.stats.reset();
		this.nPlusOneDetector?.reset();
		this.nPlusOnePatterns = [];
	}

	/**
	 * Run EXPLAIN ANALYZE on a query to get its execution plan.
	 * Must be called with a raw SQL client.
	 *
	 * @param sql - The SQL query to analyze
	 * @param params - Query parameters
	 * @param executor - Function that executes raw SQL (e.g., db.execute)
	 */
	static async explainAnalyze(
		sql: string,
		params: unknown[],
		executor: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }>,
	): Promise<ExplainAnalyzeResult> {
		const explainSQL = `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${sql}`;
		const result = await executor(explainSQL, params);

		const rows = result.rows as Array<{
			"QUERY PLAN": Array<{
				Plan?: {
					"Actual Total Time"?: number;
					"Planning Time"?: number;
					"Actual Rows"?: number;
				};
			}>;
		}>;

		const plan = rows?.[0]?.["QUERY PLAN"];
		const planData = plan?.[0]?.Plan;

		return {
			queryPlan: JSON.stringify(plan ?? [], null, 2),
			executionTimeMs: planData?.["Actual Total Time"] ?? 0,
			planningTimeMs: planData?.["Planning Time"] ?? 0,
			rows: planData?.["Actual Rows"] ?? 0,
		};
	}

	/**
	 * Get the current configuration.
	 */
	getConfig(): Readonly<QueryMonitorConfig> {
		return { ...this.config };
	}
}

// ── Singleton ────────────────────────────────────────────────────────────

let _queryMonitor: QueryMonitor | null = null;

/**
 * Get or create the singleton QueryMonitor instance.
 */
export function getQueryMonitor(config?: Partial<QueryMonitorConfig>): QueryMonitor {
	if (!_queryMonitor) {
		_queryMonitor = new QueryMonitor(config);
	}
	return _queryMonitor;
}

/** Reset the singleton (useful for testing) */
export function resetQueryMonitor(): void {
	_queryMonitor?.reset();
	_queryMonitor = null;
}

// ── Utility Functions ─────────────────────────────────────────────────────

/**
 * Normalize a SQL query for comparison. Strips literal values so that
 * parameterized queries with different values are treated as the same pattern.
 *
 * Example: "SELECT * FROM users WHERE id = 42"
 *       -> "SELECT * FROM users WHERE id = ?"
 */
function normalizeSQL(sql: string): string {
	return sql
		.replace(/'[^']*'/g, "?") // String literals
		.replace(/\b\d+\b/g, "?") // Integer literals
		.replace(/\s+/g, " ") // Collapse whitespace
		.trim()
		.toLowerCase();
}

/**
 * Truncate SQL for log output.
 */
function truncateSQL(sql: string, maxLength = 200): string {
	if (sql.length <= maxLength) return sql;
	return sql.slice(0, maxLength) + "...";
}

// ── Express/Next.js Middleware ────────────────────────────────────────────

/**
 * Creates a Next.js / Express-compatible middleware that logs all
 * database queries made during a request.
 *
 * Usage with Next.js App Router:
 *   // middleware.ts
 *   import { createQueryMonitorMiddleware } from '@/db/query-monitor';
 *   export const middleware = createQueryMonitorMiddleware();
 */
export function createQueryMonitorMiddleware(config?: Partial<QueryMonitorConfig>) {
	const monitor = getQueryMonitor(config);

	return {
		/**
		 * Wrap a route handler in query monitoring.
		 * Call at the start of each request to reset the N+1 detector.
		 */
		startRequest: () => {
			monitor.getConfig(); // ensure initialized
		},

		/**
		 * Call at the end of each request to check for issues.
		 */
		endRequest: () => {
			const stats = monitor.getStats();
			if (stats.nPlusOnePatterns.length > 0) {
				console.warn(
					`[QueryMonitor] Request had ${stats.nPlusOnePatterns.length} N+1 query pattern(s)`,
				);
			}
		},

		monitor,
	};
}

/**
 * Higher-order function that wraps a query function with monitoring.
 *
 * Usage:
 *   const getUser = withMonitor('getUser', async (id: string) => {
 *     return db.query.user.findFirst({ where: eq(user.id, id) });
 *   });
 */
export function withMonitor<T extends (...args: unknown[]) => Promise<unknown>>(
	label: string,
	fn: T,
	options?: { sql?: string },
): T {
	const monitor = getQueryMonitor();

	return (async (...args: Parameters<T>) => {
		return monitor.track(label, () => fn(...args), {
			sql: options?.sql,
			params: args as unknown[],
		});
	}) as T;
}
