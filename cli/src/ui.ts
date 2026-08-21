// Output formatting: JSON mode or human-friendly tables. No external deps.
import { isatty } from 'node:tty';

const USE_COLOR = process.env.NO_COLOR === undefined && isatty(1);
const c = (code: string, s: string) => (USE_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
export const dim = (s: string) => c('2', s);
export const bold = (s: string) => c('1', s);
export const green = (s: string) => c('32', s);
export const red = (s: string) => c('31', s);
export const yellow = (s: string) => c('33', s);
export const cyan = (s: string) => c('36', s);

export function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

/** Render a simple table from rows. Columns auto-sized, capped to terminal width. */
export function printTable(rows: Record<string, unknown>[], columns: { key: string; label: string; width?: number }[]): void {
  if (rows.length === 0) { process.stdout.write(dim('(no rows)') + '\n'); return; }
  const termWidth = process.stdout.columns && process.stdout.columns > 0 ? process.stdout.columns : 80;
  const cap = (w: number) => Math.min(w, Math.max(8, Math.floor(termWidth / columns.length) - 1));
  const widths = columns.map((col) => {
    const dataMax = Math.max(...rows.map((r) => String(r[col.key] ?? '').length));
    return cap(col.width ?? Math.max(col.label.length, Math.min(40, dataMax)));
  });
  const header = columns.map((col, i) => pad(truncate(col.label, widths[i]), widths[i])).join('  ');
  process.stdout.write(bold(header) + '\n');
  process.stdout.write(dim('-'.repeat(header.length)) + '\n');
  for (const row of rows) {
    process.stdout.write(columns.map((col, i) => pad(truncate(String(row[col.key] ?? ''), widths[i]), widths[i])).join('  ') + '\n');
  }
}

export function printKeyValue(pairs: [string, string][]): void {
  const maxKey = Math.max(...pairs.map(([k]) => k.length));
  for (const [k, v] of pairs) process.stdout.write(`${dim(pad(k, maxKey))}  ${v}\n`);
}

export function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
