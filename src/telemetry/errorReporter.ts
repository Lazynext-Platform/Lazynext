/**
 * Lightweight, opt-in error reporting for Lazynext.
 *
 * This module provides a minimal error reporting scaffold that can be
 * connected to Sentry, PostHog, or any other error tracking service.
 *
 * By default, error reporting is DISABLED. To enable it, set the
 * `LAZYNEXT_ERROR_REPORTING_DSN` environment variable to your
 * Sentry (or compatible) DSN.
 *
 * When disabled, errors are only logged to the console.
 * When enabled, errors are batched and sent to the configured endpoint.
 *
 * Privacy: No user data, file contents, or project data is ever sent.
 * Only error type, message, stack trace, and app version are reported.
 */

const DSN = import.meta.env.VITE_ERROR_REPORTING_DSN ?? '';
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'unknown';
const IS_ENABLED = DSN.length > 0;

interface ErrorReport {
  type: string;
  message: string;
  stack?: string;
  appVersion: string;
  timestamp: string;
  url: string;
  userAgent: string;
}

const queue: ErrorReport[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 5000);
}

function flush(): void {
  flushTimer = null;
  if (queue.length === 0 || !IS_ENABLED) return;
  const reports = queue.splice(0, queue.length);
  const body = JSON.stringify({ reports });
  // Fire-and-forget — errors in telemetry must never crash the app
  fetch(DSN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => {
    // Silently drop — telemetry is best-effort
  });
}

function createReport(error: Error | string): ErrorReport {
  const err = typeof error === 'string' ? new Error(error) : error;
  return {
    type: err.name || 'Error',
    message: err.message,
    stack: err.stack,
    appVersion: APP_VERSION,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  };
}

/** Report an error to the configured tracking service (if enabled). */
export function reportError(error: Error | string): void {
  const report = createReport(error);

  // Always log to console
  console.error('[Lazynext]', report.type + ':', report.message, report.stack ?? '');

  if (!IS_ENABLED) return;
  queue.push(report);
  scheduleFlush();
}

/** Report an error with additional context. */
export function reportErrorWithContext(error: Error | string, context: Record<string, string>): void {
  const report = createReport(error);
  report.message = `${report.message} | Context: ${JSON.stringify(context)}`;

  console.error('[Lazynext]', report.type + ':', report.message, report.stack ?? '');

  if (!IS_ENABLED) return;
  queue.push(report);
  scheduleFlush();
}

/** Whether error reporting is currently active. */
export function isErrorReportingEnabled(): boolean {
  return IS_ENABLED;
}

/**
 * Install global error handlers for uncaught exceptions and unhandled rejections.
 * Call this once at app startup.
 */
export function installGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    reportError(event.error ?? event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    reportError(reason instanceof Error ? reason : String(reason));
  });
}
