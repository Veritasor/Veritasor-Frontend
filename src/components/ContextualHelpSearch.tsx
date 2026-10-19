import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface HelpArticle {
  id: string
  title: string
  description: string
  keywords: string[]
  href: string
  categories: string[]
}

// ─── Help article data ──────────────────────────────────────────────────────

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with Veritasor',
    description: 'Learn how to set up your workspace, connect revenue sources, and create your first attestation.',
    keywords: ['setup', 'workspace', 'first steps', 'introduction', 'onboarding', 'beginner'],
    href: '/help',
    categories: ['Getting Started'],
  },
  {
    id: 'connect-sources',
    title: 'Connecting Revenue Sources',
    description: 'Integrate Stripe, Shopify, PayPal, and other platforms to pull revenue data for attestations.',
    keywords: ['stripe', 'shopify', 'paypal', 'integration', 'connect', 'api', 'revenue source'],
    href: '/sources?connect=true',
    categories: ['Revenue Sources', 'Integrations'],
  },
  {
    id: 'create-attestation',
    title: 'Creating an Attestation',
    description: 'Trigger a new revenue proof attestation—select sources, review data, and submit to chain.',
    keywords: ['attestation', 'proof', 'revenue', 'trigger', 'create', 'submit', 'on-chain'],
    href: '/attestations?new=true',
    categories: ['Attestations'],
  },
  {
    id: 'verify-proofs',
    title: 'Verifying Attestation Proofs',
    description: 'Understand Merkle roots, Stellar transaction hashes, and how to independently verify proofs.',
    keywords: ['merkle', 'stellar', 'hash', 'verify', 'proof', 'blockchain', 'transaction'],
    href: '/attestations',
    categories: ['Attestations', 'Security'],
  },
  {
    id: 'api-keys',
    title: 'Managing API Keys',
    description: 'Create, rotate, and revoke API keys for programmatic access to the Veritasor verification API.',
    keywords: ['api', 'key', 'secret', 'rotate', 'revoke', 'token', 'authentication'],
    href: '/api-keys',
    categories: ['Settings', 'Security'],
  },
  {
    id: 'team-access',
    title: 'Managing Team Access & Permissions',
    description: 'Invite team members, assign roles, and configure workspace-level access controls.',
    keywords: ['team', 'permissions', 'roles', 'access', 'invite', 'members', 'rbac'],
    href: '/settings',
    categories: ['Settings', 'Team'],
  },
  {
    id: 'webhooks',
    title: 'Configuring Webhooks',
    description: 'Set up webhook endpoints to receive real-time attestation status updates and event notifications.',
    keywords: ['webhook', 'endpoint', 'event', 'notification', 'real-time', 'callback'],
    href: '/settings',
    categories: ['Settings', 'Integrations'],
  },
  {
    id: 'billing',
    title: 'Understanding Billing & Plans',
    description: 'Explore pricing tiers, view invoices, update payment methods, and manage your subscription.',
    keywords: ['billing', 'plan', 'invoice', 'payment', 'subscription', 'pricing', 'upgrade'],
    href: '/settings',
    categories: ['Settings', 'Billing'],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting Failed Attestations',
    description: 'Diagnose common attestation failures—network timeouts, data mismatches, and remediation steps.',
    keywords: ['failed', 'error', 'timeout', 'troubleshoot', 'diagnose', 'retry', 'remediation'],
    href: '/help',
    categories: ['Troubleshooting'],
  },
  {
    id: 'security',
    title: 'Security Best Practices',
    description: 'Enable MFA, manage session timeouts, and follow recommendations to keep your account secure.',
    keywords: ['security', 'mfa', '2fa', 'session', 'password', 'authentication', 'hardware key'],
    href: '/settings',
    categories: ['Security', 'Getting Started'],
  },
  {
    id: 'export-data',
    title: 'Exporting Attestation Data',
    description: 'Download attestation records and revenue proofs in CSV, JSON, or PDF formats.',
    keywords: ['export', 'download', 'csv', 'json', 'pdf', 'data', 'report'],
    href: '/attestations',
    categories: ['Attestations'],
  },
  {
    id: 'data-sources',
    title: 'Supported Data Sources & Formats',
    description: 'Review the list of supported revenue platforms, file formats, and data schema requirements.',
    keywords: ['format', 'schema', 'csv', 'api', 'supported', 'platform', 'compatible'],
    href: '/sources',
    categories: ['Revenue Sources', 'Getting Started'],
  },
  {
    id: 'onboarding',
    title: 'Business Onboarding (KYB/KYC)',
    description: 'Complete identity verification for your business—upload documents, selfie capture, and bank details.',
    keywords: ['kyb', 'kyc', 'onboarding', 'verification', 'document', 'identity', 'business'],
    href: '/onboarding',
    categories: ['Getting Started'],
  },
  {
    id: 'density-theme',
    title: 'Customizing Display Density & Theme',
    description: 'Switch between comfortable and compact density modes, and toggle light/dark/system themes.',
    keywords: ['density', 'theme', 'dark mode', 'light mode', 'compact', 'comfortable', 'display'],
    href: '/settings',
    categories: ['Settings'],
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts Reference',
    description: 'Full list of keyboard shortcuts for navigation, actions, and power-user workflows.',
    keywords: ['shortcut', 'keyboard', 'hotkey', 'navigation', 'quick', 'productivity'],
    href: '/help',
    categories: ['Getting Started'],
  },
]

// ─── Page context → article suggestions (empty state) ───────────────────────

const PAGE_CONTEXT_SUGGESTIONS: Record<string, string[]> = {
  '/dashboard': ['getting-started', 'connect-sources', 'create-attestation'],
  '/attestations': ['create-attestation', 'verify-proofs', 'troubleshooting', 'export-data'],
  '/sources': ['connect-sources', 'data-sources', 'create-attestation'],
  '/settings': ['api-keys', 'team-access', 'billing', 'density-theme'],
  '/api-keys': ['api-keys', 'security', 'webhooks'],
  '/help': ['getting-started', 'shortcuts', 'troubleshooting', 'security'],
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

const DEFAULT_SUGGESTIONS = ['getting-started', 'connect-sources', 'create-attestation', 'shortcuts']

// ─── localStorage helpers ───────────────────────────────────────────────────

const RECENTS_KEY = 'veritasor-recent-help-searches'
const MAX_RECENTS = 5

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTS) : []
  } catch {
    return []
  }
}

function saveRecents(ids: string[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(ids.slice(0, MAX_RECENTS)))
  } catch {
    // localStorage unavailable
  }
}

// ─── Component props ────────────────────────────────────────────────────────

interface ContextualHelpSearchProps {
  open: boolean
  onClose: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ContextualHelpSearch({ open, onClose }: ContextualHelpSearchProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recents, setRecents] = useState<string[]>([])
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const titleId = useId()
  const statusId = useId()

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150)
    return () => clearTimeout(timer)
  }, [query])

  // ── Load recents on open ─────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setRecents(loadRecents())
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  // ── Focus trap + Escape ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const focusable = Array.from(
        dialogRef.current!.querySelectorAll<HTMLElement>(FOCUSABLE),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // ── Track a recently selected article ────────────────────────────────────
  const trackRecent = useCallback((articleId: string) => {
    setRecents((prev) => {
      const next = [articleId, ...prev.filter((id) => id !== articleId)].slice(0, MAX_RECENTS)
      saveRecents(next)
      return next
    })
  }, [])

  // ── Filter articles ──────────────────────────────────────────────────────
  const filteredArticles = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return HELP_ARTICLES

    return HELP_ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.keywords.some((kw) => kw.toLowerCase().includes(q)) ||
        a.categories.some((cat) => cat.toLowerCase().includes(q)),
    )
  }, [debouncedQuery])

  // ── Build visible item list ──────────────────────────────────────────────
  interface VisibleItem {
    type: 'header' | 'article' | 'empty'
    label?: string
    article?: HelpArticle
    isRecent?: boolean
  }

  const visibleItems = useMemo((): VisibleItem[] => {
    const items: VisibleItem[] = []
    const q = debouncedQuery.trim().toLowerCase()

    if (!q) {
      // Empty state: show recent searches first, then contextual suggestions
      const recentArticles = recents
        .map((id) => HELP_ARTICLES.find((a) => a.id === id))
        .filter((a): a is HelpArticle => !!a)

      if (recentArticles.length > 0) {
        items.push({ type: 'header', label: 'Recent searches' })
        recentArticles.forEach((a) => items.push({ type: 'article', article: a, isRecent: true }))
      }

      // Contextual suggestions based on current page
      const currentPath = location.pathname
      const suggestionIds = PAGE_CONTEXT_SUGGESTIONS[currentPath] ?? DEFAULT_SUGGESTIONS
      const suggestions = suggestionIds
        .map((id) => HELP_ARTICLES.find((a) => a.id === id))
        .filter((a): a is HelpArticle => !!a && !recentArticles.some((r) => r.id === a.id))

      if (suggestions.length > 0) {
        items.push({ type: 'header', label: 'Suggested for this page' })
        suggestions.forEach((a) => items.push({ type: 'article', article: a }))
      }

      // Remaining articles not yet shown
      const shownIds = new Set([...recentArticles.map((a) => a.id), ...suggestions.map((a) => a.id)])
      const remaining = HELP_ARTICLES.filter((a) => !shownIds.has(a.id))
      if (remaining.length > 0) {
        items.push({ type: 'header', label: 'All help articles' })
        remaining.forEach((a) => items.push({ type: 'article', article: a }))
      }
    } else {
      // Search results
      if (filteredArticles.length === 0) {
        items.push({ type: 'empty' })
      } else {
        items.push({ type: 'header', label: `${filteredArticles.length} article${filteredArticles.length > 1 ? 's' : ''} found` })
        filteredArticles.forEach((a) => items.push({ type: 'article', article: a }))
      }
    }
    return items
  }, [debouncedQuery, filteredArticles, recents, location.pathname])

  // ── Flatten to articles only (for keyboard navigation) ───────────────────
  const articleItems = useMemo(
    () => visibleItems.filter((v): v is VisibleItem & { article: HelpArticle } => v.type === 'article'),
    [visibleItems],
  )

  // ── Reset active index ───────────────────────────────────────────────────
  useEffect(() => {
    setActiveIndex(0)
  }, [debouncedQuery])

  // ── Scroll active into view ──────────────────────────────────────────────
  useEffect(() => {
    if (resultsRef.current) {
      const el = resultsRef.current.querySelector('[aria-selected="true"]')
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const selectArticle = useCallback(
    (article: HelpArticle) => {
      trackRecent(article.id)
      navigate(article.href)
      onClose()
    },
    [trackRecent, navigate, onClose],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) =>
          articleItems.length > 0 ? (prev + 1) % articleItems.length : 0,
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) =>
          articleItems.length > 0
            ? (prev - 1 + articleItems.length) % articleItems.length
            : 0,
        )
      } else if (e.key === 'Home') {
        e.preventDefault()
        setActiveIndex(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        setActiveIndex(articleItems.length > 0 ? articleItems.length - 1 : 0)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (articleItems[activeIndex]?.article) {
          selectArticle(articleItems[activeIndex].article!)
        }
      }
    },
    [articleItems, activeIndex, selectArticle],
  )

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  // ── Derive active option ID for aria-activedescendant ────────────────────
  const activeArticle = articleItems[activeIndex]?.article
  const activeOptionId = activeArticle ? `hs-opt-${activeArticle.id}` : undefined

  if (!open) return null

  return (
    <div className="hs-overlay" role="presentation" onClick={handleOverlayClick}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="hs-dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="hs-header">
          <h2 id={titleId} className="hs-title">
            Help &amp; Support
          </h2>
          <button
            type="button"
            className="hs-close"
            aria-label="Close help search"
            onClick={onClose}
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {/* Search input */}
        <div className="hs-search-wrap">
          <span className="hs-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            ref={inputRef}
            type="search"
            className="hs-search-input"
            placeholder="Search help articles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={true}
            aria-autocomplete="list"
            aria-controls="hs-results"
            aria-activedescendant={activeOptionId}
            aria-label="Search help articles"
          />
          {query && (
            <button
              type="button"
              className="hs-search-clear"
              aria-label="Clear search"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
            >
              <span aria-hidden="true">✕</span>
            </button>
          )}
        </div>

        {/* Live status for screen readers */}
        <span
          id={statusId}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {debouncedQuery
            ? `${filteredArticles.length} article${filteredArticles.length !== 1 ? 's' : ''} matching`
            : `${articleItems.length} articles available`}
        </span>

        {/* Results */}
        <div ref={resultsRef} id="hs-results" className="hs-results" role="listbox" aria-label="Help articles">
          {visibleItems.map((item, vi) => {
            if (item.type === 'header') {
              return (
                <div key={item.label} className="hs-section-header" role="presentation">
                  {item.label}
                </div>
              )
            }

            if (item.type === 'empty') {
              return (
                <div key="empty" className="hs-empty" role="presentation">
                  <span className="hs-empty-icon" aria-hidden="true">📭</span>
                  <p className="hs-empty-title">No articles match "{debouncedQuery}"</p>
                  <p className="hs-empty-subtitle">
                    Try searching for: attestation, api keys, billing, security, webhooks…
                  </p>
                </div>
              )
            }

            const article = item.article!
            const articleIdx = articleItems.findIndex((a) => a.article?.id === article.id)
            const isActive = articleIdx === activeIndex
            const optionId = `hs-opt-${article.id}`

            return (
              <div
                key={article.id}
                id={optionId}
                role="option"
                aria-selected={isActive}
                className={`hs-article${isActive ? ' hs-article-active' : ''}`}
                onClick={() => selectArticle(article)}
                onMouseEnter={() => setActiveIndex(articleIdx)}
              >
                <div className="hs-article-icon" aria-hidden="true">
                  {article.categories.includes('Getting Started') ? '📖' :
                   article.categories.includes('Security') ? '🔒' :
                   article.categories.includes('Billing') ? '💳' :
                   article.categories.includes('Troubleshooting') ? '🔧' :
                   '📄'}
                </div>
                <div className="hs-article-content">
                  <span className="hs-article-title">
                    {article.title}
                    {item.isRecent && <span className="hs-recent-badge" aria-label="Recently viewed">Recent</span>}
                  </span>
                  <span className="hs-article-desc">{article.description}</span>
                </div>
                <div className="hs-article-categories" aria-hidden="true">
                  {article.categories.slice(0, 2).map((cat) => (
                    <span key={cat} className="hs-category-chip">{cat}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer hints */}
        <div className="hs-footer" aria-hidden="true">
          <div className="hs-tip">
            <kbd>↑↓</kbd> <span>Navigate</span>
          </div>
          <div className="hs-tip">
            <kbd>Enter</kbd> <span>Open</span>
          </div>
          <div className="hs-tip">
            <kbd>Esc</kbd> <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  )
}
