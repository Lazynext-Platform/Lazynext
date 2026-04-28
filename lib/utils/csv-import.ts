// CSV import helpers extracted from `components/ui/ImportModal.tsx` so the
// parser + row-mapper can be unit-tested in isolation. Behavior is byte-for-byte
// identical to the previous inline implementation.

export type NodeType = 'task' | 'doc' | 'decision' | 'thread' | 'pulse' | 'automation' | 'table'

export const VALID_NODE_TYPES: NodeType[] = [
  'task',
  'doc',
  'decision',
  'thread',
  'pulse',
  'automation',
  'table',
]

export interface ImportItem {
  title: string
  type: NodeType
  status?: string
  data?: Record<string, unknown>
}

/**
 * Minimal RFC 4180-ish CSV parser. Handles quoted fields with embedded commas
 * and double-quote escapes. Good enough for typical Notion/Linear exports.
 *
 * Returns `headers` (trimmed) and `rows` (raw string cells; blank-only rows
 * filtered out). The first non-empty record is treated as the header row.
 */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        row.push(field)
        field = ''
      } else if (c === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else if (c === '\r') {
        /* skip — CRLF handled by the LF branch */
      } else {
        field += c
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  const headers = (rows.shift() ?? []).map((h) => h.trim())
  return {
    headers,
    rows: rows.filter((r) => r.some((cell) => cell.trim().length > 0)),
  }
}

/**
 * Map parsed CSV rows to import items. Detects the title column by trying
 * common header names (`title`, `name`, `task`, `subject`); falls back to
 * the first column. `type` defaults to `'task'` when missing or invalid.
 * `status` is optional and pulled from a `status` column when present.
 * All other columns become entries in `data`.
 */
export function rowsToImportItems(headers: string[], rows: string[][]): ImportItem[] {
  const lower = headers.map((h) => h.toLowerCase())
  const titleIdx = (() => {
    const candidates = ['title', 'name', 'task', 'subject']
    for (const c of candidates) {
      const idx = lower.indexOf(c)
      if (idx !== -1) return idx
    }
    return 0
  })()
  const typeIdx = lower.indexOf('type')
  const statusIdx = lower.indexOf('status')

  return rows
    .map((row) => {
      const title = (row[titleIdx] ?? '').trim()
      if (!title) return null
      const rawType = typeIdx !== -1 ? (row[typeIdx] ?? '').trim().toLowerCase() : 'task'
      const type: NodeType = (VALID_NODE_TYPES as readonly string[]).includes(rawType)
        ? (rawType as NodeType)
        : 'task'
      const data: Record<string, unknown> = {}
      headers.forEach((h, i) => {
        if (i === titleIdx || i === typeIdx) return
        const v = (row[i] ?? '').trim()
        if (v) data[h] = v
      })
      return {
        title,
        type,
        status: statusIdx !== -1 ? (row[statusIdx] ?? '').trim() || undefined : undefined,
        data: Object.keys(data).length > 0 ? data : undefined,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
}
