import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useAttestations } from '../state/attestations'
import { verifyProofPassword } from '../utils/proofShare'

const EXPIRY_MS: Record<string, number> = {
  '1hour': 60 * 60 * 1000,
  '1day': 24 * 60 * 60 * 1000,
  '1week': 7 * 24 * 60 * 60 * 1000,
}

function isExpired(search: string): boolean {
  const params = new URLSearchParams(search)
  const expiry = params.get('expires')
  if (!expiry || expiry === 'none') return false

  const duration = EXPIRY_MS[expiry]
  const createdAt = Date.parse(params.get('createdAt') ?? '')
  return !duration || !Number.isFinite(createdAt) || createdAt + duration <= Date.now()
}

function PageMessage({ title, children }: { title: string; children: string }) {
  return (
    <main style={{ maxWidth: '48rem', margin: '4rem auto', padding: '1.5rem' }}>
      <h1>{title}</h1>
      <p role="status">{children}</p>
    </main>
  )
}

export default function VerifyProof() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { getById } = useAttestations()
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isCheckingPassword, setIsCheckingPassword] = useState(false)
  const [unlockedLink, setUnlockedLink] = useState<string | null>(null)
  const linkIdentity = `${location.pathname}${location.search}${location.hash}`
  const isUnlocked = unlockedLink === linkIdentity

  useEffect(() => {
    setPassword('')
    setPasswordError('')
    setUnlockedLink(null)
  }, [linkIdentity])

  if (!id) {
    return <PageMessage title="Proof not found">No attestation ID was provided.</PageMessage>
  }

  const params = new URLSearchParams(location.search)
  if (params.get('share') && params.get('share') !== id) {
    return <PageMessage title="Proof not found">This proof link is invalid.</PageMessage>
  }

  const attestation = getById(id)
  if (!attestation) {
    return <PageMessage title="Proof not found">No attestation matches this proof link.</PageMessage>
  }

  if (isExpired(location.search)) {
    return <PageMessage title="Proof link expired">This shared proof link has expired.</PageMessage>
  }

  const isProtected = params.get('protected') === '1'
  const verifier = new URLSearchParams(location.hash.slice(1)).get('password')

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!verifier) {
      setPasswordError('This protected proof link is invalid.')
      return
    }

    setIsCheckingPassword(true)
    setPasswordError('')
    try {
      if (await verifyProofPassword(password, verifier)) {
        setUnlockedLink(linkIdentity)
      } else {
        setPasswordError('The password is incorrect.')
      }
    } catch {
      setPasswordError('Password verification is unavailable in this browser.')
    } finally {
      setIsCheckingPassword(false)
    }
  }

  if (isProtected && !isUnlocked) {
    if (!verifier) {
      return <PageMessage title="Protected proof link unavailable">This protected proof link is invalid.</PageMessage>
    }

    return (
      <main
        style={{
          maxWidth: '32rem',
          margin: '4rem auto',
          padding: '1.5rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <h1>Protected attestation proof</h1>
        <p>Enter the password provided by the person who shared this proof.</p>
        <form onSubmit={handlePasswordSubmit} style={{ display: 'grid', gap: '1rem' }}>
          <label htmlFor="proof-password">Password</label>
          <input
            id="proof-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="auth-input"
          />
          {passwordError && <p role="alert">{passwordError}</p>}
          <button type="submit" disabled={isCheckingPassword || password.length === 0}>
            {isCheckingPassword ? 'Verifying…' : 'View proof'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main
      style={{
        maxWidth: '52rem',
        margin: '2rem auto',
        padding: '1.5rem',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      <header>
        <p style={{ color: 'var(--muted)', marginBottom: '0.5rem' }}>Veritasor public proof</p>
        <h1 style={{ marginTop: 0 }}>Attestation {attestation.id}</h1>
        <p>
          Verification status:{' '}
          <strong aria-label={`Attestation status: ${attestation.status}`}>
            {attestation.status.charAt(0).toUpperCase() + attestation.status.slice(1)}
          </strong>
        </p>
      </header>

      <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(8rem, auto) 1fr', gap: '0.75rem 1rem' }}>
        <dt>Source</dt><dd>{attestation.source}</dd>
        <dt>Period</dt><dd>{attestation.period}</dd>
        <dt>Records</dt><dd>{attestation.recordCount}</dd>
        <dt>Total revenue</dt><dd>{attestation.totalRevenue} {attestation.currency}</dd>
        <dt>Attested</dt><dd><time dateTime={attestation.timestamp}>{new Date(attestation.timestamp).toLocaleString()}</time></dd>
        <dt>Merkle root</dt><dd><code>{attestation.merkleRoot}</code></dd>
        <dt>Stellar transaction</dt><dd><code>{attestation.stellarTxHash || 'Not available'}</code></dd>
      </dl>

      {attestation.failureReason && (
        <section aria-label="Verification details">
          <h2>Verification details</h2>
          <p>{attestation.failureReason}</p>
          {attestation.remediation && <p>{attestation.remediation}</p>}
        </section>
      )}
    </main>
  )
}
