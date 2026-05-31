import { useState } from 'react'
import { useToast } from '../components/ToastContext'

export default function Dashboard() {
  const { addToast } = useToast()
  const [sources, setSources] = useState([
    { id: 'stripe', name: 'Stripe', connected: true },
    { id: 'razorpay', name: 'Razorpay', connected: true },
    { id: 'shopify', name: 'Shopify', connected: false, comingSoon: true }
  ])

  const handleDisconnect = (id: string, name: string) => {
    // Show a warning/info toast when disconnecting
    addToast(`Disconnecting ${name} will stop all automatic revenue syncs.`, 'warning')

    // Disconnect the source in state after a tiny delay or immediately
    setTimeout(() => {
      setSources((prev) =>
        prev.map((src) => (src.id === id ? { ...src, connected: false } : src))
      )
      addToast(`${name} has been disconnected successfully.`, 'info')
    }, 600)
  }

  const handleConnect = (id: string, name: string) => {
    setSources((prev) =>
      prev.map((src) => (src.id === id ? { ...src, connected: true } : src))
    )
    addToast(`${name} is now connected.`, 'success')
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <p style={{ color: 'var(--muted)' }}>
        Connect your revenue sources and manage attestations from here.
      </p>

      <section
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: '1.2rem', marginBottom: '1.5rem' }}>Active Revenue Sources</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {sources.map((src) => (
            <div
              key={src.id}
              style={{
                background: 'var(--surface-strong)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{src.name}</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  {src.comingSoon ? 'Integration coming soon' : src.connected ? 'Synchronizing hourly' : 'Not linked'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem',
                    borderRadius: 9999,
                    background: src.comingSoon
                      ? 'var(--surface-soft)'
                      : src.connected
                      ? 'var(--success-soft)'
                      : 'var(--danger-soft)',
                    color: src.comingSoon ? 'var(--muted)' : src.connected ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  {src.comingSoon ? 'Coming Soon' : src.connected ? 'Connected' : 'Disconnected'}
                </span>

                {!src.comingSoon && (
                  <button
                    onClick={() => (src.connected ? handleDisconnect(src.id, src.name) : handleConnect(src.id, src.name))}
                    style={{
                      background: src.connected ? 'rgba(251, 113, 133, 0.1)' : 'rgba(94, 234, 212, 0.1)',
                      border: `1px solid ${src.connected ? 'var(--danger)' : 'var(--accent)'}`,
                      color: src.connected ? 'var(--danger)' : 'var(--accent)',
                      borderRadius: 4,
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background-color 150ms ease',
                    }}
                  >
                    {src.connected ? 'Disconnect' : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
