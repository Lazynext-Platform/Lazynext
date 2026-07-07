/**
 * Type declarations for Bun built-in modules.
 * These modules are only available in the Bun runtime.
 */

declare module "bun:sqlite" {
	/** A connection to a SQLite database file. */
	export class Database {
		constructor(path: string, opts?: { readonly?: boolean; create?: boolean });
		/** Run a raw SQL query and return all rows. */
		query<T = Record<string, unknown>>(sql: string): T[];
		/** Execute a SQL statement with parameters, returning the change count. */
		run(sql: string, ...params: unknown[]): { changes: number };
		/** Compile a parameterized SQL statement for repeated execution. */
		prepare(sql: string): Statement;
		/** Close the database connection. */
		close(): void;
	}

	/** A pre-compiled SQL statement. */
	export class Statement {
		/** Execute and return all matching rows. */
		all<T = Record<string, unknown>>(...params: unknown[]): T[];
		/** Execute and return the first matching row, or null. */
		get<T = Record<string, unknown>>(...params: unknown[]): T | null;
		/** Execute with parameters, returning the change count. */
		run(...params: unknown[]): { changes: number };
		/** Release the compiled statement. */
		finalize(): void;
	}
}
