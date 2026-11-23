import { describe, expect, it } from 'vitest'
import { escapeCsvCell, sanitizeCsvFormula, toCsv } from './csv'

describe('csv utilities', () => {
  describe('sanitizeCsvFormula', () => {
    it('prefixes cells starting with =, +, -, @ with a single quote', () => {
      expect(sanitizeCsvFormula('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)")
      expect(sanitizeCsvFormula('+1+1')).toBe("'+1+1")
      expect(sanitizeCsvFormula('-2+3')).toBe("'-2+3")
      expect(sanitizeCsvFormula('@SUM(A1)')).toBe("'@SUM(A1)")
    })

    it('prefixes cells starting with tab or carriage return', () => {
      expect(sanitizeCsvFormula('\t=cmd')).toBe("'\t=cmd")
      expect(sanitizeCsvFormula('\r=cmd')).toBe("'\r=cmd")
    })

    it('prefixes cells where leading whitespace precedes =, +, -, @', () => {
      expect(sanitizeCsvFormula('  =cmd|"/c calc"!A0')).toBe("'  =cmd|\"/c calc\"!A0")
      expect(sanitizeCsvFormula(' +cmd')).toBe("' +cmd")
      expect(sanitizeCsvFormula(' -cmd')).toBe("' -cmd")
      expect(sanitizeCsvFormula(' @cmd')).toBe("' @cmd")
    })

    it('leaves safe values untouched', () => {
      expect(sanitizeCsvFormula('')).toBe('')
      expect(sanitizeCsvFormula('Attestation completed')).toBe('Attestation completed')
      expect(sanitizeCsvFormula('2026-07-28T08:12:00Z')).toBe('2026-07-28T08:12:00Z')
      expect(sanitizeCsvFormula('user@example.com')).toBe('user@example.com')
      expect(sanitizeCsvFormula('a-b+c=d')).toBe('a-b+c=d')
    })
  })

  describe('escapeCsvCell', () => {
    it('formats null and undefined as empty strings', () => {
      expect(escapeCsvCell(null)).toBe('')
      expect(escapeCsvCell(undefined)).toBe('')
    })

    it('converts numbers and booleans to strings and sanitizes negative numbers', () => {
      expect(escapeCsvCell(42)).toBe('42')
      expect(escapeCsvCell(true)).toBe('true')
      expect(escapeCsvCell(-42)).toBe("'-42")
    })

    it('quotes fields containing commas, double quotes, CR, or LF per RFC 4180', () => {
      expect(escapeCsvCell('a,b')).toBe('"a,b"')
      expect(escapeCsvCell('say "hello"')).toBe('"say ""hello"""')
      expect(escapeCsvCell('line1\nline2')).toBe('"line1\nline2"')
      expect(escapeCsvCell('line1\r\nline2')).toBe('"line1\r\nline2"')
    })

    it('combines formula-injection prefixing with RFC 4180 quoting when both apply', () => {
      expect(escapeCsvCell('=HYPERLINK("http://evil.example", "click")')).toBe(
        '"\'=HYPERLINK(""http://evil.example"", ""click"")"',
      )
      expect(escapeCsvCell('+1,000')).toBe('"\'+1,000"')
      expect(escapeCsvCell('-1\n2')).toBe('"\'-1\n2"')
      expect(escapeCsvCell('@cmd,"arg"')).toBe('"\'@cmd,""arg"""')
    })
  })

  describe('toCsv', () => {
    it('serializes headers and rows of arrays with CRLF line endings', () => {
      const csv = toCsv(
        ['id', 'event', 'details'],
        [
          ['1', 'Attestation completed', 'Merkle root: 0x7f...3a'],
          ['2', 'Revenue, connected', 'Provider: "Stripe"'],
        ],
      )
      expect(csv).toBe(
        [
          'id,event,details',
          '1,Attestation completed,Merkle root: 0x7f...3a',
          '2,"Revenue, connected","Provider: ""Stripe"""',
        ].join('\r\n'),
      )
    })

    it('neutralizes formula injection (=, +, -, @) across object rows and columns', () => {
      const rows = [
        { id: '1', event: '=1+1', details: '+cmd|"/c calc"!A0' },
        { id: '2', event: '-2+3', details: '@SUM(1,2)' },
      ]
      const csv = toCsv(rows, [
        { key: 'id', header: 'id' },
        { key: 'event', header: 'event' },
        { key: 'details', header: 'details' },
      ])
      const lines = csv.split('\r\n')
      expect(lines).toEqual([
        'id,event,details',
        '1,\'=1+1,"\'+cmd|""/c calc""!A0"',
        '2,\'-2+3,"\'@SUM(1,2)"',
      ])
    })

    it('infers columns from the first object when columns are omitted and supports key arrays', () => {
      const rows = [{ id: '1', event: 'Login', details: null }]
      expect(toCsv(rows)).toBe('id,event,details\r\n1,Login,')
      expect(toCsv(rows, ['id', 'event'])).toBe('id,event\r\n1,Login')
      expect(toCsv([])).toBe('')
    })
  })
})
