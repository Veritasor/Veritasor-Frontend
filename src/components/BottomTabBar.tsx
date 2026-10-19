import { NavLink } from 'react-router-dom'

interface TabItem {
  path: string
  label: string
  icon: React.ReactNode
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12l9-9 9 9" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function AttestationIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function SourcesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 8h20" />
      <path d="M6 12h4" />
      <path d="M6 16h4" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

const tabs: TabItem[] = [
  { path: '/dashboard', label: 'Home', icon: <HomeIcon /> },
  { path: '/attestations', label: 'Attestations', icon: <AttestationIcon /> },
  { path: '/sources', label: 'Sources', icon: <SourcesIcon /> },
  { path: '/settings', label: 'Settings', icon: <SettingsIcon /> },
]

export default function BottomTabBar() {
  return (
    <nav aria-label="Mobile navigation" className="bottom-tab-bar">
      <div className="bottom-tab-bar-track">
        {tabs.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) => `bottom-tab${isActive ? ' bottom-tab-active' : ''}`}
          >
            <span className="bottom-tab-icon" aria-hidden="true">{tab.icon}</span>
            <span className="bottom-tab-label">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}