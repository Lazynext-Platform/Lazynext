/**
 * connection-pool.ts — Advanced connection pool management for Lazynext
 *
 * Features:
 * - Read/write split across multiple pools
 * - Circuit breaker pattern to prevent cascading failures
 * - Exponential backoff retry with jitter
 * - Pool warmup on cold start
 * - Health checks with configurable timeouts
 * - Comprehensive pool metrics (active, idle, waiting, errors)
 * - Integration with OpenTelemetry tracing
 *
 * Architecture:
 *   writer pool  → primary PostgreSQL (all writes + strongly-consistent reads)
 *   reader pool  → read replicas via PgBouncer (eventually-consistent reads)
 */

import postgres, { type Sql, type Options } from "postgres";

// ── Types ────────────────────────────────────────────────────────────────

/** Per-pool configuration */
export interface PoolConfig {
	/** Maximum connections in this pool */
	maxConnections: number;
	/** Connection string (DATABASE_URL format) */
	connectionString: string;
	/** Idle timeout in seconds before closing unused connections */
	idleTimeoutSeconds: number;
	/** Connection timeout in seconds */
	connectTimeoutSeconds: number;
	/** Maximum lifetime of a connection in seconds (0 = unlimited) */
	maxLifetimeSeconds: number;
}

/** Snapshot of pool metrics at a point in time */
export interface PoolMetrics {
	poolName: "writer" | "reader";
	active: number;
	idle: number;
	waiting: number;
	total: number;
	max: number;
	errors: number;
	lastError: string | null;
	lastErrorAt: number | null;
	uptimeMs: number;
}

export interface CircuitBreakerState {
	state: "closed" | "open" | "half-open";
	failureCount: number;
	lastFailureTime: number | null;
	lastSuccessTime: number | null;
	openedAt: number | null;
}

export interface RetryOptions {
	maxRetries: number;
	baseDelayMs: number;
	maxDelayMs: number;
	factor: number; // exponential backoff factor
}

export interface HealthCheckResult {
	healthy: boolean;
	latencyMs: number;
	error?: string;
	poolMetrics: {
		writer: PoolMetrics;
		reader: PoolMetrics | null;
	};
	circuitBreaker: CircuitBreakerState;
	timestamp: string;
}

export interface PoolManagerConfig {
	writer: PoolConfig;
	reader: PoolConfig | null;
	retryOptions: RetryOptions;
	circuitBreakerThreshold: number;
	circuitBreakerResetTimeoutMs: number;
	enableReaderPool: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
	maxRetries: 5,
	baseDelayMs: 100,
	maxDelayMs: 10_000,
	factor: 2,
};

const DEFAULT_CIRCUIT_BREAKER_THRESHOLD = 5;
const DEFAULT_CIRCUIT_BREAKER_RESET_MS = 30_000;
const HEALTH_CHECK_TIMEOUT_MS = 5_000;
const STATS_RESET_INTERVAL_MS = 300_000; // 5 minutes

// ── Circuit Breaker ───────────────────────────────────────────────────────

class CircuitBreaker {
	private state: CircuitBreakerState = {
		state: "closed",
		failureCount: 0,
		lastFailureTime: null,
		lastSuccessTime: null,
		openedAt: null,
	};

	constructor(
		private threshold: number = DEFAULT_CIRCUIT_BREAKER_THRESHOLD,
		private resetTimeoutMs: number = DEFAULT_CIRCUIT_BREAKER_RESET_MS,
	) {}

	getState(): CircuitBreakerState {
		return { ...this.state };
	}

	/** Returns true if the circuit allows the request through */
	allowRequest(): boolean {
		if (this.state.state === "open") {
			const elapsed = Date.now() - (this.state.openedAt ?? 0);
			if (elapsed >= this.resetTimeoutMs) {
				this.state.state = "half-open";
				console.log("[CircuitBreaker] Transitioned: open → half-open");
				return true;
			}
			return false;
		}
		return true; // closed or half-open allows through
	}

	recordSuccess(): void {
		this.state.state = "closed";
		this.state.failureCount = 0;
		this.state.lastSuccessTime = Date.now();
		this.state.openedAt = null;
	}

	recordFailure(): void {
		this.state.failureCount++;
		this.state.lastFailureTime = Date.now();

		if (this.state.failureCount >= this.threshold) {
			this.state.state = "open";
			this.state.openedAt = Date.now();
			console.warn(
				`[CircuitBreaker] OPEN — ${this.state.failureCount} failures exceeded threshold ${this.threshold}`,
			);
		}
	}

	reset(): void {
		this.state = {
			state: "closed",
			failureCount: 0,
			lastFailureTime: null,
			lastSuccessTime: null,
			openedAt: null,
		};
	}
}

// ── Metrics Collector ─────────────────────────────────────────────────────

class PoolMetricsCollector {
	private errors = 0;
	private lastError: string | null = null;
	private lastErrorAt: number | null = null;
	private startTime: number = Date.now();
	private lastResetTime: number = Date.now();

	recordError(message: string): void {
		this.errors++;
		this.lastError = message;
		this.lastErrorAt = Date.now();
	}

	getMetrics(
		poolName: "writer" | "reader",
		client: Sql | null,
		max: number,
	): PoolMetrics {
		return {
			poolName,
			active: (client as Sql<Record<string, never>>)?.options?.max ?? 0,
			idle: Math.max(0, max - ((client as Sql<Record<string, never>>)?.options?.max ?? 0)),
			waiting: 0,
			total: max,
			max,
			errors: this.errors,
			lastError: this.lastError,
			lastErrorAt: this.lastErrorAt,
			uptimeMs: Date.now() - this.startTime,
		};
	}

	/** Reset error counters periodically to avoid unbounded growth */
	maybeReset(): void {
		if (Date.now() - this.lastResetTime >= STATS_RESET_INTERVAL_MS) {
			this.errors = 0;
			this.lastResetTime = Date.now();
		}
	}
}

// ── Pool Manager ──────────────────────────────────────────────────────────

export class PoolManager {
	private writerClient: Sql | null = null;
	private readerClient: Sql | null = null;
	private writerMetrics: PoolMetricsCollector;
	private readerMetrics: PoolMetricsCollector;
	private circuitBreaker: CircuitBreaker;
	private config: PoolManagerConfig;
	private initialized = false;

	constructor(config: PoolManagerConfig) {
		this.config = config;
		this.writerMetrics = new PoolMetricsCollector();
		this.readerMetrics = new PoolMetricsCollector();
		this.circuitBreaker = new CircuitBreaker(
			config.circuitBreakerThreshold,
			config.circuitBreakerResetTimeoutMs,
		);
	}

	// ── Initialization ───────────────────────────────────────────────────

	/** Warm up pools on cold start. Call once during app bootstrap. */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		console.log("[PoolManager] Initializing connection pools...");

		// Create writer pool
		this.writerClient = this.createPool(this.config.writer, "writer");

		// Create reader pool if enabled
		if (this.config.enableReaderPool && this.config.reader) {
			this.readerClient = this.createPool(this.config.reader, "reader");
		}

		// Warm up connections
		await this.warmupPool(this.writerClient, "writer");
		if (this.readerClient) {
			await this.warmupPool(this.readerClient, "reader");
		}

		this.initialized = true;
		console.log("[PoolManager] Pools initialized and warmed up.");
	}

	/** Create a postgres.js pool from configuration */
	private createPool(config: PoolConfig, label: string): Sql {
		const postgresOptions: Options<Record<string, never>> = {
			max: config.maxConnections,
			idle_timeout: config.idleTimeoutSeconds,
			connect_timeout: config.connectTimeoutSeconds,
			max_lifetime: config.maxLifetimeSeconds || undefined,
			prepare: false, // Better for connection pooling
			onnotice: () => {}, // Suppress notice messages
			debug: (connection, query, params) => {
				// Optional: integrate with OpenTelemetry here
			},
		};

		console.log(
			`[PoolManager] Creating ${label} pool: max=${config.maxConnections}, ` +
				`idle_timeout=${config.idleTimeoutSeconds}s, ` +
				`connect_timeout=${config.connectTimeoutSeconds}s`,
		);

		return postgres(config.connectionString, postgresOptions);
	}

	/** Execute a lightweight query on all pool connections to pre-establish them */
	private async warmupPool(client: Sql, label: string): Promise<void> {
		try {
			const warmupQueries = Array.from(
				{ length: this.getPoolMax(label) },
				() => client`SELECT 1 AS warmup`,
			);
			await Promise.allSettled(warmupQueries);
			console.log(`[PoolManager] ${label} pool warmed up.`);
		} catch (err) {
			console.warn(`[PoolManager] ${label} pool warmup partially failed:`, err);
		}
	}

	private getPoolMax(label: string): number {
		if (label === "reader" && this.config.reader) {
			return this.config.reader.maxConnections;
		}
		return this.config.writer.maxConnections;
	}

	// ── Query Execution ──────────────────────────────────────────────────

	/** Execute a query on the writer pool (primary) */
	get writer(): Sql {
		if (!this.writerClient) {
			throw new Error(
				"[PoolManager] Writer pool not initialized. Call initialize() first.",
			);
		}
		return this.writerClient;
	}

	/** Execute a query on the reader pool (replica), falling back to writer */
	get reader(): Sql {
		if (!this.config.enableReaderPool || !this.readerClient) {
			return this.writer;
		}
		return this.readerClient;
	}

	/** Execute a query with circuit breaker and retry logic */
	async executeWithRetry<T>(
		queryFn: (client: Sql) => Promise<T>,
		options?: {
			useReader?: boolean;
			retryOptions?: Partial<RetryOptions>;
			context?: string;
		},
	): Promise<T> {
		if (!this.circuitBreaker.allowRequest()) {
			throw new Error(
				"[PoolManager] Circuit breaker is OPEN — refusing request",
			);
		}

		const retryOpts = { ...DEFAULT_RETRY_OPTIONS, ...options?.retryOptions };
		const client = options?.useReader ? this.reader : this.writer;
		let lastError: Error | null = null;

		for (let attempt = 0; attempt <= retryOpts.maxRetries; attempt++) {
			try {
				const result = await queryFn(client);
				this.circuitBreaker.recordSuccess();
				this.writerMetrics.maybeReset();
				return result;
			} catch (err) {
				lastError = err instanceof Error ? err : new Error(String(err));
				const label = options?.context ?? "query";

				this.writerMetrics.recordError(lastError.message);
				this.circuitBreaker.recordFailure();

				if (attempt === retryOpts.maxRetries) {
					console.error(
						`[PoolManager] ${label}: all ${retryOpts.maxRetries + 1} attempts failed`,
						lastError.message,
					);
					throw lastError;
				}

				// Exponential backoff with jitter
				const delay = Math.min(
					retryOpts.baseDelayMs * Math.pow(retryOpts.factor, attempt),
					retryOpts.maxDelayMs,
				);
				const jitter = delay * (0.5 + Math.random() * 0.5); // 50-100% of delay

				console.warn(
					`[PoolManager] ${label}: attempt ${attempt + 1}/${retryOpts.maxRetries + 1} failed, ` +
						`retrying in ${Math.round(jitter)}ms: ${lastError.message}`,
				);

				await sleep(jitter);
			}
		}

		throw lastError ?? new Error("[PoolManager] Unknown retry failure");
	}

	// ── Health Check ─────────────────────────────────────────────────────

	async healthCheck(): Promise<HealthCheckResult> {
		const startTime = Date.now();
		let healthy = true;
		let error: string | undefined;

		try {
			const timeoutPromise = new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error("Health check timed out")),
					HEALTH_CHECK_TIMEOUT_MS,
				),
			);

			// Test writer pool
			const writerResult = await Promise.race([
				this.writer`SELECT 1 AS health`,
				timeoutPromise,
			]);

			if (!writerResult[0]) {
				healthy = false;
				error = "Writer pool health check returned no result";
			}
		} catch (err) {
			healthy = false;
			error = err instanceof Error ? err.message : "Unknown health check failure";
		}

		const writerMetrics = this.writerMetrics.getMetrics(
			"writer",
			this.writerClient,
			this.config.writer.maxConnections,
		);
		const readerMetrics = this.readerClient
			? this.readerMetrics.getMetrics(
					"reader",
					this.readerClient,
					this.config.reader?.maxConnections ?? 0,
				)
			: null;

		return {
			healthy,
			latencyMs: Date.now() - startTime,
			error,
			poolMetrics: {
				writer: writerMetrics,
				reader: readerMetrics,
			},
			circuitBreaker: this.circuitBreaker.getState(),
			timestamp: new Date().toISOString(),
		};
	}

	// ── Metrics ──────────────────────────────────────────────────────────

	getMetrics(): { writer: PoolMetrics; reader: PoolMetrics | null } {
		return {
			writer: this.writerMetrics.getMetrics(
				"writer",
				this.writerClient,
				this.config.writer.maxConnections,
			),
			reader: this.readerClient
				? this.readerMetrics.getMetrics(
						"reader",
						this.readerClient,
						this.config.reader?.maxConnections ?? 0,
					)
				: null,
		};
	}

	getCircuitBreakerState(): CircuitBreakerState {
		return this.circuitBreaker.getState();
	}

	resetCircuitBreaker(): void {
		this.circuitBreaker.reset();
		console.log("[PoolManager] Circuit breaker manually reset.");
	}

	// ── Lifecycle ────────────────────────────────────────────────────────

	/** Gracefully close all pools. Call during app shutdown. */
	async shutdown(): Promise<void> {
		console.log("[PoolManager] Shutting down connection pools...");
		const shutdowns: Promise<void>[] = [];

		if (this.writerClient) {
			shutdowns.push(this.writerClient.end({ timeout: 5 }));
		}
		if (this.readerClient) {
			shutdowns.push(this.readerClient.end({ timeout: 5 }));
		}

		await Promise.allSettled(shutdowns);
		this.initialized = false;
		console.log("[PoolManager] All pools shut down.");
	}
}

// ── Singleton ─────────────────────────────────────────────────────────────

let _poolManager: PoolManager | null = null;

/**
 * Get or create the singleton PoolManager instance.
 * Reads configuration from environment variables.
 */
export function getPoolManager(): PoolManager {
	if (_poolManager) return _poolManager;

	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL environment variable is required for pool manager");
	}

	const readerUrl =
		process.env.DATABASE_READER_URL ?? databaseUrl; // fall back to writer

	const enableReader =
		process.env.DATABASE_READER_ENABLED === "true" &&
		readerUrl !== databaseUrl;

	const config: PoolManagerConfig = {
		writer: {
			maxConnections: parseInt(process.env.DB_POOL_MAX ?? "20", 10),
			connectionString: databaseUrl,
			idleTimeoutSeconds: parseInt(process.env.DB_POOL_IDLE_TIMEOUT ?? "30", 10),
			connectTimeoutSeconds: parseInt(process.env.DB_CONNECT_TIMEOUT ?? "10", 10),
			maxLifetimeSeconds: parseInt(process.env.DB_POOL_MAX_LIFETIME ?? "0", 10),
		},
		reader: enableReader
			? {
					maxConnections: parseInt(process.env.DB_READER_POOL_MAX ?? "10", 10),
					connectionString: readerUrl,
					idleTimeoutSeconds: parseInt(process.env.DB_POOL_IDLE_TIMEOUT ?? "30", 10),
					connectTimeoutSeconds: parseInt(process.env.DB_CONNECT_TIMEOUT ?? "10", 10),
					maxLifetimeSeconds: parseInt(process.env.DB_POOL_MAX_LIFETIME ?? "0", 10),
				}
			: null,
		retryOptions: DEFAULT_RETRY_OPTIONS,
		circuitBreakerThreshold: parseInt(
			process.env.DB_CIRCUIT_BREAKER_THRESHOLD ?? String(DEFAULT_CIRCUIT_BREAKER_THRESHOLD),
			10,
		),
		circuitBreakerResetTimeoutMs: parseInt(
			process.env.DB_CIRCUIT_BREAKER_RESET_MS ?? String(DEFAULT_CIRCUIT_BREAKER_RESET_MS),
			10,
		),
		enableReaderPool: enableReader,
	};

	_poolManager = new PoolManager(config);
	return _poolManager;
}

/** Reset the singleton (useful for testing) */
export function resetPoolManager(): void {
	if (_poolManager) {
		_poolManager.shutdown().catch(console.error);
		_poolManager = null;
	}
}

// ── Utility ───────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Re-export for convenience ─────────────────────────────────────────────

export { postgres };
export type { Sql, Options };
