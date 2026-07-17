/** @module Diagnostic type definitions for element validation warnings and errors */
export type DiagnosticSeverity = "caution" | "error";

/** Type definition for DiagnosticDefinition. */
export interface DiagnosticDefinition {
	/** Unique diagnostic identifier. */
	id: string;
	/** Diagnostic scope category. */
	scope: string;
	/** Severity level. */
	severity: DiagnosticSeverity;
	/** Human-readable diagnostic message. */
	message: string;
}
