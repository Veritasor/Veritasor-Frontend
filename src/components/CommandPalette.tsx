import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from './ToastContext'

export interface Command {
  id: string
  title: string
  description?: string
  shortcut?: string[]
  category: 'Navigation' | 'Actions' | 'Settings'
}

export const COMMANDS: Command[] = [
  {
    id: 'nav-dashboard',
    title: 'Go to Dashboard',
    description: 'Navigate to the business dashboard analytics overview',
    shortcut: ['G', 'D'],
    category: 'Navigation',
  },
  {
    id: 'nav-attestations',
    title: 'Go to Attestations',
    description: 'View and manage revenue proof attestations',
    shortcut: ['G', 'A'],
    category: 'Navigation',
  },
  {
    id: 'nav-sources',
    title: 'Go to Revenue Sources',
    description: 'View connected integrations and revenue flow',
    shortcut: ['G', 'S'],
    category: 'Navigation',
  },
  {
    id: 'action-connect-source',
    title: 'Connect Revenue Source',
    description: 'Integrate Stripe, Shopify, or other platforms',
    shortcut: ['C', 'S'],
    category: 'Actions',
  },
  {
    id: 'action-create-attestation',
    title: 'New Attestation',
    description: 'Trigger a new revenue proof attestation',
    shortcut: ['N', 'A'],
    category: 'Actions',
  },
  {
    id: 'action-toggle-theme',
    title: 'Toggle Theme',
    description: 'Switch between light and dark mode appearance',
    shortcut: ['T', 'T'],
    category: 'Actions',
  },
  {
    id: 'settings-profile',
    title: 'Profile Settings',
    description: 'Update user account preferences and initials',
    category: 'Settings',
  },
  {
    id: 'settings-api-keys',
    title: 'API Keys',
    description: 'Manage verification access keys and secrets',
    category: 'Settings',
  },
  {
    id: 'action-sign-out',
    title: 'Sign Out',
    description: 'Safely log out of the Veritasor dashboard',
    category: 'Settings',
  },
]

// Map commands to actions
const executeCommand = (id: string, navigate: ReturnType<typeof useNavigate>, addToast: ReturnType<typeof useToast>['addToast']) => {
  switch (id) {
    case 'nav-dashboard':
      navigate('/')
      break
    case 'nav-attestations':
      navigate('/attestations')
      break
    case 'nav-sources':
      navigate('/sources')
      break
    case 'action-connect-source':
      navigate('/sources?connect=true')
      break
    case 'action-create-attestation':
      navigate('/attestations?new=true')
      break
    case 'action-toggle-theme': {
      const current = document.documentElement.getAttribute('data-theme')
      const next = current === 'light' ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', next)
      addToast(`Theme switched to ${next} mode`, 'success')
      break
    }
    case 'settings-profile':
      addToast('Profile settings loaded', 'info')
      break
    case 'settings-api-keys':
      addToast('API keys loaded', 'info')
      break
    case 'action-sign-out':
      addToast('Signed out successfully', 'success')
      navigate('/login')
      break
    default:
      break
  }
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recents, setRecents] = useState<string[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Load recents on mount and when palette opens
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('veritasor-recent-commands')
      if (stored) {
        try {
          setRecents(JSON.parse(stored))
        } catch {
          setRecents([])
        }
      }
      setQuery('')
      setActiveIndex(0)
      // Small timeout to ensure input is mounted
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [isOpen])

  // Save a command as recent
  const saveToRecents = (id: string) => {
    const nextRecents = [id, ...recents.filter((r) => r !== id)].slice(0, 4)
    setRecents(nextRecents)
    localStorage.setItem('veritasor-recent-commands', JSON.stringify(nextRecents))
  }

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    if (!query) return COMMANDS
    return COMMANDS.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(query.toLowerCase()) ||
        (cmd.description && cmd.description.toLowerCase().includes(query.toLowerCase())),
    )
  }, [query])

  // Get recents mapped to command items
  const recentCommands = useMemo(() => {
    if (query) return []
    return recents
      .map((id) => COMMANDS.find((cmd) => cmd.id === id))
      .filter((cmd): cmd is Command => !!cmd)
  }, [recents, query])

  // Construct a single flat list of visible items to easily manage active index
  const visibleItems = useMemo(() => {
    const items: (Command & { isRecent?: boolean })[] = []

    // If query is empty, show recents first
    if (!query && recentCommands.length > 0) {
      recentCommands.forEach((cmd) => {
        items.push({ ...cmd, isRecent: true })
      })
    }

    // Then show main filtered commands (or all commands grouped if query is empty)
    filteredCommands.forEach((cmd) => {
      // Don't show in main list if it's already in recents (to avoid double entry in empty state)
      const inRecents = !query && recentCommands.some((r) => r.id === cmd.id)
      if (!inRecents) {
        items.push(cmd)
      }
    })

    return items
  }, [filteredCommands, recentCommands, query])

  // Reset active index when query/results change
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Scroll active element into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[aria-selected="true"]')
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex])

  const handleSelect = (cmd: Command) => {
    saveToRecents(cmd.id)
    executeCommand(cmd.id, navigate, addToast)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (visibleItems.length ? (prev + 1) % visibleItems.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (visibleItems.length ? (prev - 1 + visibleItems.length) % visibleItems.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (visibleItems[activeIndex]) {
        handleSelect(visibleItems[activeIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Tab') {
      // Focus Trap: keep focus on input if user tabs
      e.preventDefault()
    }
  }

  // Handle clicking outside modal
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  // Categorize visible items for rendering
  const renderedSections = (() => {
    const sections: { title: string; items: typeof visibleItems }[] = []

    if (!query && recentCommands.length > 0) {
      sections.push({
        title: 'Recent Searches',
        items: visibleItems.filter((i) => i.isRecent),
      })
    }

    const mainItems = visibleItems.filter((i) => !i.isRecent)
    const categories = ['Navigation', 'Actions', 'Settings'] as const

    categories.forEach((cat) => {
      const catItems = mainItems.filter((i) => i.category === cat)
      if (catItems.length > 0) {
        sections.push({ title: cat, items: catItems })
      }
    })

    return sections
  })()

  // Track global index in rendering
  let itemCounter = 0

  const activeOptionId = visibleItems[activeIndex]
    ? `cmd-opt-${visibleItems[activeIndex].id}${visibleItems[activeIndex].isRecent ? '-recent' : ''}`
    : undefined

  return (
    <div
      className="cmd-overlay"
      role="presentation"
      onClick={handleOverlayClick}
    >
      <div
        className="cmd-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="cmd-search-wrapper">
          <span className="cmd-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder="Search dashboard navigation, actions, and settings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-expanded={true}
            aria-autocomplete="list"
            aria-controls="cmd-list"
            aria-activedescendant={activeOptionId}
          />
          <span className="cmd-esc-badge" aria-hidden="true">
            ESC
          </span>
        </div>

        <div className="cmd-results" ref={listRef} id="cmd-list" role="listbox" aria-label="Commands">
          {visibleItems.length === 0 ? (
            <div className="cmd-empty">
              <span className="cmd-empty-icon" aria-hidden="true">
                📭
              </span>
              <p className="cmd-empty-title">No results found for "{query}"</p>
              <p className="cmd-empty-subtitle">Try searching for dashboard, attestations, themes, or integrations.</p>
            </div>
          ) : (
            renderedSections.map((section) => (
              <div key={section.title} className="cmd-group" role="presentation">
                <h3 className="cmd-group-title" role="presentation">
                  {section.title}
                </h3>
                <ul className="cmd-group-list" role="presentation">
                  {section.items.map((cmd) => {
                    const currentIdx = itemCounter
                    itemCounter++
                    const isActive = currentIdx === activeIndex
                    const itemId = `cmd-opt-${cmd.id}${cmd.isRecent ? '-recent' : ''}`

                    return (
                      <li
                        key={itemId}
                        id={itemId}
                        role="option"
                        aria-selected={isActive}
                        className={`cmd-item${isActive ? ' cmd-item-active' : ''}`}
                        onClick={() => handleSelect(cmd)}
                        onMouseEnter={() => setActiveIndex(currentIdx)}
                      >
                        <div className="cmd-item-icon" aria-hidden="true">
                          {cmd.category === 'Navigation' ? '🧭' : cmd.id === 'action-toggle-theme' ? '🌓' : '⚡'}
                        </div>
                        <div className="cmd-item-content">
                          <span className="cmd-item-title">{cmd.title}</span>
                          {cmd.description && <span className="cmd-item-desc">{cmd.description}</span>}
                        </div>
                        {cmd.shortcut && (
                          <div className="cmd-item-shortcut" aria-hidden="true">
                            {cmd.shortcut.map((key) => (
                              <kbd key={key}>{key}</kbd>
                            ))}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="cmd-footer" aria-hidden="true">
          <div className="cmd-tip">
            <kbd>↑↓</kbd> <span>Navigate</span>
          </div>
          <div className="cmd-tip">
            <kbd>Enter</kbd> <span>Select</span>
          </div>
          <div className="cmd-tip">
            <kbd>Esc</kbd> <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  )
}
