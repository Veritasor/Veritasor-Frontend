import { useState, useCallback } from 'react'

export interface JsonTreeNodeProps {
  label?: string
  data: unknown
  path?: string
  depth?: number
  defaultExpandedDepth?: number
}

function getType(val: unknown): 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' {
  if (val === null) return 'null'
  if (Array.isArray(val)) return 'array'
  if (typeof val === 'object') return 'object'
  if (typeof val === 'string') return 'string'
  if (typeof val === 'number') return 'number'
  if (typeof val === 'boolean') return 'boolean'
  return 'string'
}

export function JsonTreeNode({
  label,
  data,
  path = '$',
  depth = 0,
  defaultExpandedDepth = 2,
}: JsonTreeNodeProps) {
  const nodeType = getType(data)
  const isExpandable = nodeType === 'object' || nodeType === 'array'
  const [isExpanded, setIsExpanded] = useState<boolean>(depth < defaultExpandedDepth)
  const [copied, setCopied] = useState<boolean>(false)

  const handleCopyNode = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation()
      const textToCopy = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    },
    [data],
  )

  const toggleExpand = useCallback(() => {
    if (isExpandable) {
      setIsExpanded((prev) => !prev)
    }
  }, [isExpandable])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isExpandable) return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleExpand()
      } else if (e.key === 'ArrowRight' && !isExpanded) {
        e.preventDefault()
        setIsExpanded(true)
      } else if (e.key === 'ArrowLeft' && isExpanded) {
        e.preventDefault()
        setIsExpanded(false)
      }
    },
    [isExpandable, isExpanded, toggleExpand],
  )

  const copyLabel = label ? `Copy value for ${label}` : `Copy JSON node at ${path}`

  if (!isExpandable) {
    let valueColor = 'var(--text)'
    let displayValue = String(data)

    if (nodeType === 'string') {
      valueColor = '#34d399' // emerald / success string color
      displayValue = `"${data}"`
    } else if (nodeType === 'number') {
      valueColor = '#60a5fa' // blue number color
    } else if (nodeType === 'boolean') {
      valueColor = '#f59e0b' // amber boolean color
    } else if (nodeType === 'null') {
      valueColor = '#9ca3af' // muted null color
    }

    return (
      <div
        className="json-tree-node json-tree-leaf"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.15rem 0.4rem',
          borderRadius: 4,
          fontSize: 'var(--text-sm, 0.875rem)',
          fontFamily: 'monospace',
          lineHeight: 1.5,
          position: 'relative',
        }}
      >
        {label && (
          <span style={{ color: 'var(--accent, #38bdf8)', fontWeight: 600 }}>
            "{label}":
          </span>
        )}
        <span style={{ color: valueColor, wordBreak: 'break-all' }}>{displayValue}</span>

        <button
          type="button"
          onClick={handleCopyNode}
          aria-label={copyLabel}
          title={copyLabel}
          style={{
            marginLeft: 'auto',
            padding: '0.1rem 0.4rem',
            fontSize: '0.75rem',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--surface-soft, rgba(255,255,255,0.05))',
            color: copied ? 'var(--success, #34d399)' : 'var(--muted)',
            cursor: 'pointer',
            minHeight: 24,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
    )
  }

  const entries =
    nodeType === 'array'
      ? (data as unknown[]).map((val, idx) => ({ key: String(idx), val }))
      : Object.entries(data as Record<string, unknown>).map(([k, val]) => ({ key: k, val }))

  const openBracket = nodeType === 'array' ? '[' : '{'
  const closeBracket = nodeType === 'array' ? ']' : '}'
  const itemCount = entries.length

  return (
    <div
      className="json-tree-node json-tree-container"
      style={{
        fontFamily: 'monospace',
        fontSize: 'var(--text-sm, 0.875rem)',
        lineHeight: 1.5,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.15rem 0.4rem',
          borderRadius: 4,
        }}
      >
        <button
          type="button"
          onClick={toggleExpand}
          onKeyDown={handleKeyDown}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${label ? `node "${label}"` : 'JSON object'} (${itemCount} ${nodeType === 'array' ? 'items' : 'keys'})`}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            padding: '0 0.2rem',
            fontSize: '0.8rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
          }}
        >
          {isExpanded ? '▼' : '▶'}
        </button>

        {label && (
          <span style={{ color: 'var(--accent, #38bdf8)', fontWeight: 600 }}>
            "{label}":
          </span>
        )}

        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{openBracket}</span>

        {!isExpanded && (
          <span style={{ color: 'var(--muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
            {itemCount} {nodeType === 'array' ? 'items' : 'keys'} {closeBracket}
          </span>
        )}

        <button
          type="button"
          onClick={handleCopyNode}
          aria-label={copyLabel}
          title={copyLabel}
          style={{
            marginLeft: 'auto',
            padding: '0.1rem 0.4rem',
            fontSize: '0.75rem',
            borderRadius: 4,
            border: '1px solid var(--border)',
            background: 'var(--surface-soft, rgba(255,255,255,0.05))',
            color: copied ? 'var(--success, #34d399)' : 'var(--muted)',
            cursor: 'pointer',
            minHeight: 24,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.2rem',
          }}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {isExpanded && (
        <div
          role="group"
          aria-label={label ? `Contents of ${label}` : 'JSON contents'}
          style={{
            paddingLeft: '1.25rem',
            borderLeft: '1px dashed var(--border)',
            marginLeft: '0.55rem',
          }}
        >
          {entries.map(({ key, val }) => (
            <JsonTreeNode
              key={key}
              label={nodeType === 'array' ? undefined : key}
              data={val}
              path={`${path}.${key}`}
              depth={depth + 1}
              defaultExpandedDepth={defaultExpandedDepth}
            />
          ))}
          <div style={{ color: 'var(--text)', fontWeight: 600, paddingLeft: '0.4rem' }}>
            {closeBracket}
          </div>
        </div>
      )}
    </div>
  )
}

export interface JsonTreeViewerProps {
  data: unknown
  title?: string
  defaultExpandedDepth?: number
}

export default function JsonTreeViewer({
  data,
  title = 'Payload JSON',
  defaultExpandedDepth = 2,
}: JsonTreeViewerProps) {
  return (
    <div
      className="json-tree-viewer"
      style={{
        background: 'var(--surface-strong, #091322)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        overflowX: 'auto',
      }}
    >
      <div className="sr-only" aria-live="polite">
        {title} loaded
      </div>
      <JsonTreeNode data={data} depth={0} defaultExpandedDepth={defaultExpandedDepth} />
    </div>
  )
}
