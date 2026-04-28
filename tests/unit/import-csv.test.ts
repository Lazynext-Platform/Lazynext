import { describe, it, expect } from 'vitest'
import { parseCsv, rowsToImportItems } from '@/lib/utils/csv-import'

describe('parseCsv', () => {
  it('parses a simple two-row CSV', () => {
    const { headers, rows } = parseCsv('title,type\nAlpha,task\nBeta,doc\n')
    expect(headers).toEqual(['title', 'type'])
    expect(rows).toEqual([
      ['Alpha', 'task'],
      ['Beta', 'doc'],
    ])
  })

  it('trims header whitespace', () => {
    const { headers } = parseCsv(' title , type \nA,task\n')
    expect(headers).toEqual(['title', 'type'])
  })

  it('handles a missing trailing newline', () => {
    const { rows } = parseCsv('title\nAlpha')
    expect(rows).toEqual([['Alpha']])
  })

  it('handles CRLF line endings', () => {
    const { headers, rows } = parseCsv('title,type\r\nAlpha,task\r\nBeta,doc\r\n')
    expect(headers).toEqual(['title', 'type'])
    expect(rows).toEqual([
      ['Alpha', 'task'],
      ['Beta', 'doc'],
    ])
  })

  it('preserves quoted fields with embedded commas', () => {
    const { rows } = parseCsv('title\n"Alpha, beta and gamma"\n')
    expect(rows).toEqual([['Alpha, beta and gamma']])
  })

  it('decodes "" as a literal quote inside quoted fields', () => {
    const { rows } = parseCsv('title\n"She said ""hi"""\n')
    expect(rows).toEqual([['She said "hi"']])
  })

  it('preserves quoted newlines inside fields', () => {
    const { rows } = parseCsv('title,body\nAlpha,"line one\nline two"\n')
    expect(rows).toEqual([['Alpha', 'line one\nline two']])
  })

  it('skips rows that are entirely blank', () => {
    const { rows } = parseCsv('title\nAlpha\n\n  \nBeta\n')
    expect(rows).toEqual([['Alpha'], ['Beta']])
  })

  it('returns empty headers and rows for empty input', () => {
    const { headers, rows } = parseCsv('')
    expect(headers).toEqual([])
    expect(rows).toEqual([])
  })

  it('keeps cells that contain only whitespace inside otherwise non-blank rows', () => {
    const { rows } = parseCsv('a,b\nAlpha, \n')
    expect(rows).toEqual([['Alpha', ' ']])
  })
})

describe('rowsToImportItems', () => {
  it('maps title + type + status columns (status also lands in `data`)', () => {
    // Existing behavior: only title and type columns are excluded from `data`.
    // `status` is surfaced as a top-level field AND retained in `data` so the
    // raw row is preserved for any downstream consumer.
    const items = rowsToImportItems(
      ['title', 'type', 'status'],
      [['Alpha', 'task', 'In Progress']],
    )
    expect(items).toEqual([
      {
        title: 'Alpha',
        type: 'task',
        status: 'In Progress',
        data: { status: 'In Progress' },
      },
    ])
  })

  it('falls back to "task" for unknown type values', () => {
    const items = rowsToImportItems(
      ['title', 'type'],
      [['Alpha', 'spaceship']],
    )
    expect(items[0]?.type).toBe('task')
  })

  it('lowercases type before validation', () => {
    const items = rowsToImportItems(['title', 'type'], [['Alpha', 'DECISION']])
    expect(items[0]?.type).toBe('decision')
  })

  it('detects title via alternative header names', () => {
    expect(rowsToImportItems(['name'], [['Alpha']])[0]?.title).toBe('Alpha')
    expect(rowsToImportItems(['task'], [['Alpha']])[0]?.title).toBe('Alpha')
    expect(rowsToImportItems(['subject'], [['Alpha']])[0]?.title).toBe('Alpha')
  })

  it('falls back to the first column when no recognised title header exists', () => {
    const items = rowsToImportItems(['random', 'extra'], [['Alpha', 'foo']])
    expect(items[0]?.title).toBe('Alpha')
    expect(items[0]?.data).toEqual({ extra: 'foo' })
  })

  it('drops rows with empty titles', () => {
    const items = rowsToImportItems(
      ['title'],
      [[''], ['  '], ['Alpha']],
    )
    expect(items).toHaveLength(1)
    expect(items[0]?.title).toBe('Alpha')
  })

  it('preserves extra columns in `data`, trimming whitespace', () => {
    const items = rowsToImportItems(
      ['title', 'priority', 'owner'],
      [['Alpha', ' high ', '  ']],
    )
    expect(items[0]?.data).toEqual({ priority: 'high' })
  })

  it('omits `data` entirely when no extra columns have values', () => {
    const items = rowsToImportItems(['title'], [['Alpha']])
    expect(items[0]?.data).toBeUndefined()
  })

  it('returns status as undefined when status cell is blank', () => {
    const items = rowsToImportItems(
      ['title', 'status'],
      [['Alpha', '   ']],
    )
    expect(items[0]?.status).toBeUndefined()
  })

  it('defaults type to "task" when no type column exists', () => {
    const items = rowsToImportItems(['title'], [['Alpha']])
    expect(items[0]?.type).toBe('task')
  })
})
