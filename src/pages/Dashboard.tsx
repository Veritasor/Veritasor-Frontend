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
      <section className="card" role="region" aria-labelledby="dashboard-card-header">
        <h2 id="dashboard-card-header" className="card-header" style={{ marginTop: 0, fontSize: '1rem' }}>Quick actions</h2>
        <ul className="card-body" style={{ color: 'var(--muted)' }}>
          <li>Connect Stripe, Razorpay, or Shopify (coming soon)</li>
          <li>Trigger monthly revenue report</li>
          <li>View attestation history</li>
        </ul>
      </section>
    </div>
  )
}
