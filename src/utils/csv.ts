/**
 * RFC 4180 CSV serialization utilities with spreadsheet formula-injection
 * (CSV injection / CWE-1236) protection.
 *
 * Formula injection protection:
 *   Spreadsheet applications (Excel, LibreOffice Calc, Google Sheets) interpret
 *   cell values beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` (including
 *   when preceded by leading whitespace) as formulas or commands. To neutralise
 *   these values without breaking human readability, a leading single quote (`'`)
 *   is prepended before RFC 4180 field quoting.
 *
 * RFC 4180 quoting:
 *   - Fields are separated by `,` and records are terminated by `\r\n`.
 *   - Any field containing `,`, `"`, `\r`, or `\n` is enclosed in double quotes.
 *   - Double quotes inside a quoted field are escaped by doubling (`""`).
 */

export type CsvCell = string | number | boolean | null | undefined

export interface CsvColumn<T> {
  /** Property key on `T` or custom accessor function. */
  key: keyof T | (string & {})
  /** Column header label emitted in the first CSV row (defaults to `String(key)`). */
  header?: string
  /** Optional custom value extractor for a row. */
  accessor?: (row: T) => CsvCell
}

const FORMULA_INJECTION_RE = /^\s*[=+\-@]|^[\t\r]/

/**
 * Neutralizes spreadsheet formula injection by prefixing dangerous leading
 * characters (`=`, `+`, `-`, `@`, `\t`, `\r`, including after leading whitespace)
 * with a single quote `'`.
 */
export function sanitizeCsvFormula(value: string): string {
  if (value.length === 0) return value
  if (FORMULA_INJECTION_RE.test(value)) {
    return `'${value}`
  }
  return value
}

/**
 * Escapes a single cell value according to RFC 4180 and protects against
 * spreadsheet formula injection.
 */
export function escapeCsvCell(raw: CsvCell): string {
  if (raw === null || raw === undefined) return ''
  const str = sanitizeCsvFormula(String(raw))
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Serializes tabular data into an RFC 4180-compliant CSV string (`\r\n` line
 * endings) with formula-injection protection on every cell and header.
 *
 * Supports two calling conventions:
 * 1. `toCsv(headers: readonly string[], rows: readonly (readonly CsvCell[])[])`
 * 2. `toCsv<T>(rows: readonly T[], columns?: readonly (keyof T | CsvColumn<T>)[])`
 */
export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly CsvCell[])[],
): string
export function toCsv<T extends object>(
  rows: readonly T[],
  columns?: readonly (keyof T | CsvColumn<T>)[],
): string
export function toCsv<T extends object>(
  first: readonly string[] | readonly T[],
  second?: readonly (readonly CsvCell[])[] | readonly (keyof T | CsvColumn<T>)[],
): string {
  // Convention 1: toCsv(headers, rowsOfArrays)
  if (
    Array.isArray(second) &&
    (first.length === 0 || typeof first[0] === 'string') &&
    (second.length === 0 || Array.isArray(second[0]))
  ) {
    const headers = first as readonly string[]
    const rows = second as readonly (readonly CsvCell[])[]
    const headerLine = headers.map((h) => escapeCsvCell(h)).join(',')
    const dataLines = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    return [headerLine, ...dataLines].join('\r\n')
  }

  // Convention 2: toCsv(objectRows, columns?)
  const rows = first as readonly T[]
  const rawColumns = second as readonly (keyof T | CsvColumn<T>)[] | undefined

  const normalizedColumns: CsvColumn<T>[] =
    rawColumns && rawColumns.length > 0
      ? rawColumns.map((col) =>
          typeof col === 'object' && col !== null && 'key' in col
            ? col
            : { key: col as keyof T, header: String(col) },
        )
      : rows.length > 0
        ? (Object.keys(rows[0]) as (keyof T)[]).map((key) => ({
            key,
            header: String(key),
          }))
        : []

  if (normalizedColumns.length === 0) {
    return ''
  }

  const headerLine = normalizedColumns
    .map((col) => escapeCsvCell(col.header ?? String(col.key)))
    .join(',')

  const dataLines = rows.map((row) =>
    normalizedColumns
      .map((col) => {
        const val = col.accessor
          ? col.accessor(row)
          : (row as Record<string, unknown>)[String(col.key)]
        return escapeCsvCell(val as CsvCell)
      })
      .join(','),
  )

  return [headerLine, ...dataLines].join('\r\n')
}
