/**
 * Type declarations for Bun built-in modules.
 * These modules are only available in the Bun runtime.
 */

declare module "bun:sqlite" {
	export class Database {
		constructor(path: string, opts?: { readonly?: boolean; create?: boolean });
		query<T = Record<string, unknown>>(sql: string): T[];
		run(sql: string, ...params: unknown[]): { changes: number };
		prepare(sql: string): Statement;
		close(): void;
	}

	export class Statement {
		all<T = Record<string, unknown>>(...params: unknown[]): T[];
		get<T = Record<string, unknown>>(...params: unknown[]): T | null;
		run(...params: unknown[]): { changes: number };
		finalize(): void;
	}
}
