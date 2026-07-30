import { useMemo, useState, type CSSProperties } from 'react'

type TokenCategory = 'Color' | 'Typography' | 'Spacing' | 'Radius'
type TokenStatus = 'Added' | 'Changed' | 'Removed'
type Token = { name: string; category: TokenCategory; value: string }

type ThemeVersion = {
  label: string
  tokens: Token[]
}

const THEME_VERSIONS: Record<string, ThemeVersion> = {
  '2.3': {
    label: 'Theme 2.3',
    tokens: [
      { name: '--color-brand', category: 'Color', value: '#22c55e' },
      { name: '--color-surface', category: 'Color', value: '#0f1b30' },
      { name: '--text-body', category: 'Typography', value: '0.95rem' },
      { name: '--space-4', category: 'Spacing', value: '1rem' },
      { name: '--radius-card', category: 'Radius', value: '12px' },
      { name: '--radius-pill', category: 'Radius', value: '999px' },
    ],
  },
  '2.4': {
    label: 'Theme 2.4',
    tokens: [
      { name: '--color-brand', category: 'Color', value: '#14b8a6' },
      { name: '--color-surface', category: 'Color', value: '#111c33' },
      { name: '--color-focus-ring', category: 'Color', value: '#fbbf24' },
      { name: '--text-body', category: 'Typography', value: '1rem' },
      { name: '--space-4', category: 'Spacing', value: '1rem' },
      { name: '--space-6', category: 'Spacing', value: '1.5rem' },
      { name: '--radius-card', category: 'Radius', value: '16px' },
    ],
  },
}

const categories: Array<TokenCategory | 'All'> = ['All', 'Color', 'Typography', 'Spacing', 'Radius']

export type TokenDiff = Token & {
  status: TokenStatus
  previousValue?: string
  currentValue?: string
}

export function getTokenDiff(previous: Token[], current: Token[]): TokenDiff[] {
  const previousByName = new Map(previous.map((token) => [token.name, token]))
  const currentByName = new Map(current.map((token) => [token.name, token]))
  const names = new Set([...previousByName.keys(), ...currentByName.keys()])

  return Array.from(names)
    .flatMap((name) => {
      const before = previousByName.get(name)
      const after = currentByName.get(name)
      if (!before && after) return [{ ...after, status: 'Added' as const, currentValue: after.value }]
      if (before && !after) return [{ ...before, status: 'Removed' as const, previousValue: before.value }]
      if (before && after && before.value !== after.value) {
        return [{ ...after, status: 'Changed' as const, previousValue: before.value, currentValue: after.value }]
      }
      return []
    })
    .sort((first, second) => first.name.localeCompare(second.name))
}

const fieldStyle: CSSProperties = {
  minHeight: 'var(--density-touch-min)',
  padding: '0.55rem 0.7rem',
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--surface-strong)',
  color: 'var(--text)',
}

function Swatch({ value, label }: { value?: string; label: string }) {
  const isColor = Boolean(value?.startsWith('#'))
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
      <span
        aria-label={value ? `${label}: ${value}` : `${label}: not present`}
        role="img"
        style={{
          width: '1.4rem', height: '1.4rem', flex: '0 0 auto', borderRadius: 5,
          border: '1px solid var(--border-strong)', background: isColor ? value : 'repeating-linear-gradient(45deg, var(--surface-strong), var(--surface-strong) 3px, var(--border) 3px, var(--border) 6px)',
        }}
      />
      <code style={{ overflowWrap: 'anywhere' }}>{value ?? '—'}</code>
    </span>
  )
}

function StatusChip({ status }: { status: TokenStatus }) {
  const colors: Record<TokenStatus, { background: string; color: string }> = {
    Added: { background: 'var(--success-soft)', color: 'var(--success)' },
    Changed: { background: 'rgba(251, 191, 36, 0.16)', color: 'var(--warning)' },
    Removed: { background: 'rgba(251, 113, 133, 0.16)', color: 'var(--danger)' },
  }
  return <span style={{ ...colors[status], borderRadius: 999, padding: '0.2rem 0.55rem', fontSize: '0.78rem', fontWeight: 800 }}>{status}</span>
}

export default function TokensDiffViewer() {
  const [previousVersion, setPreviousVersion] = useState('2.3')
  const [currentVersion, setCurrentVersion] = useState('2.4')
  const [category, setCategory] = useState<TokenCategory | 'All'>('All')
  const diff = useMemo(
    () => getTokenDiff(THEME_VERSIONS[previousVersion].tokens, THEME_VERSIONS[currentVersion].tokens),
    [previousVersion, currentVersion],
  )
  const visibleDiff = category === 'All' ? diff : diff.filter((token) => token.category === category)

  return (
    <section aria-labelledby="tokens-diff-title" style={{ padding: 'var(--density-padding)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 }}>
      <h2 id="tokens-diff-title" style={{ margin: '0 0 0.5rem', fontSize: 'var(--text-xl)' }}>Compare theme tokens</h2>
      <p style={{ margin: '0 0 1rem', color: 'var(--muted)', lineHeight: 1.6 }}>Review added, changed, and removed tokens before publishing a theme version. Status is always written in addition to color.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
        <label style={{ display: 'grid', gap: '0.35rem', fontWeight: 700 }}>Earlier version
          <select value={previousVersion} onChange={(event) => setPreviousVersion(event.target.value)} style={fieldStyle} aria-label="Earlier theme version">
            {Object.entries(THEME_VERSIONS).map(([version, theme]) => <option key={version} value={version}>{theme.label}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: '0.35rem', fontWeight: 700 }}>Later version
          <select value={currentVersion} onChange={(event) => setCurrentVersion(event.target.value)} style={fieldStyle} aria-label="Later theme version">
            {Object.entries(THEME_VERSIONS).map(([version, theme]) => <option key={version} value={version}>{theme.label}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: '0.35rem', fontWeight: 700 }}>Token category
          <select value={category} onChange={(event) => setCategory(event.target.value as TokenCategory | 'All')} style={fieldStyle} aria-label="Filter diff by token category">
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <p role="status" aria-live="polite" style={{ margin: '1rem 0 0', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>{visibleDiff.length} {visibleDiff.length === 1 ? 'difference' : 'differences'} shown.</p>
      <div style={{ marginTop: '0.75rem', overflowX: 'auto' }}>
        <div role="table" aria-label="Theme token differences" style={{ minWidth: 620, display: 'grid', gap: '0.35rem' }}>
          <div role="row" style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1.2fr) 100px minmax(135px, 1fr) minmax(135px, 1fr) 90px', gap: '0.75rem', padding: '0 0.75rem', fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--muted)' }}>
            <span role="columnheader">Token</span><span role="columnheader">Category</span><span role="columnheader">Earlier</span><span role="columnheader">Later</span><span role="columnheader">Status</span>
          </div>
          {visibleDiff.map((token) => (
            <div key={token.name} role="row" style={{ display: 'grid', gridTemplateColumns: 'minmax(150px, 1.2fr) 100px minmax(135px, 1fr) minmax(135px, 1fr) 90px', gap: '0.75rem', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-strong)' }}>
              <code role="cell" style={{ fontWeight: 800, overflowWrap: 'anywhere' }}>{token.name}</code><span role="cell">{token.category}</span><span role="cell"><Swatch value={token.previousValue} label={`Earlier value for ${token.name}`} /></span><span role="cell"><Swatch value={token.currentValue} label={`Later value for ${token.name}`} /></span><span role="cell"><StatusChip status={token.status} /></span>
            </div>
          ))}
        </div>
      </div>
      {visibleDiff.length === 0 && <p style={{ margin: '1rem 0 0', color: 'var(--muted)' }}>No differences match this category.</p>}
    </section>
  )
}
