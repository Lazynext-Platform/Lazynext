/**
 * @module Runtime diagnostic registry. Registers predicate-based checks that
 * evaluate editor state to surface actionable warnings (e.g. missing export
 * settings, empty tracks).
 */

import type { EditorCore } from "@/core";
import type { DiagnosticDefinition } from "@/diagnostics/types";

interface DiagnosticRegistration extends DiagnosticDefinition {
	/** Predicate evaluating whether the diagnostic is active. */
	check: (editor: EditorCore) => boolean;
}

/** Class representing DiagnosticsManager. */
export class DiagnosticsManager {
	private readonly registrations: DiagnosticRegistration[] = [];
	private readonly listeners = new Set<() => void>();

	constructor(private editor: EditorCore) {}

	register(registration: DiagnosticRegistration): void {
		this.registrations.push(registration);
		this.notify();
	}

	getActive(options?: { scope?: string }): ReadonlyArray<DiagnosticDefinition> {
		const candidates =
			options?.scope !== undefined
				? this.registrations.filter((r) => r.scope === options.scope)
				: this.registrations;

		return candidates.filter((r) => r.check(this.editor));
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	notify(): void {
		this.listeners.forEach((listener) => {
			listener();
		});
	}
}
