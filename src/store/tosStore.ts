/**
 * tosStore — shared, persisted Terms of Service acceptance state.
 *
 * Tracks the accepted ToS semver version and acceptance ISO-8601 timestamp
 * in localStorage, and compares against CURRENT_TOS_VERSION (v2.4.0) to
 * determine whether the user must accept a newer policy before continuing.
 */

import { useSyncExternalStore } from 'react'
import type { TermsChange } from '../components/TermsOfServiceChangelogModal'

// ---------------------------------------------------------------------------
// Current Terms of Service release metadata (v2.4.0)
// Matches public/legal/terms-of-service-v2-4-0.txt
// ---------------------------------------------------------------------------

export const CURRENT_TOS_VERSION = 'v2.4.0'
export const PREVIOUS_TOS_VERSION = 'v2.3.0'
export const TOS_EFFECTIVE_DATE = '2026-07-29'
export const TOS_FULL_TEXT_HREF = '/legal/terms-of-service-v2-4-0.txt'
export const TOS_PDF_HREF = '/legal/terms-of-service-v2-4-0.pdf'
export const TOS_SUMMARY =
  'We updated the Terms of Service to make version history explicit, surface the most relevant policy diffs, and make it easier to review the full agreement before continuing.'

export const TOS_CHANGES: TermsChange[] = [
  {
    kind: 'Added',
    title: 'Versioned changelog and comparison view',
    detail:
      'Every update now includes a release label plus a human-readable diff summary so legal and compliance reviewers can spot policy changes faster.',
  },
  {
    kind: 'Updated',
    title: 'Data retention and export language',
    detail:
      'Retention timing now states how long profile, audit, and support records are kept before deletion or anonymization.',
  },
  {
    kind: 'Removed',
    title: 'Ambiguous third-party sharing wording',
    detail:
      'The policy no longer uses broad phrasing around sharing and instead names the operational disclosures that actually apply.',
  },
]

// ---------------------------------------------------------------------------
// Types & Storage Key
// ---------------------------------------------------------------------------

export const TOS_STORAGE_KEY = 'veritasor-tos-acceptance-v1'

export interface TosAcceptanceRecord {
  acceptedVersion: string | null
  acceptedAt: string | null
}

const EMPTY_RECORD: TosAcceptanceRecord = {
  acceptedVersion: null,
  acceptedAt: null,
}

// ---------------------------------------------------------------------------
// Semver comparison
// ---------------------------------------------------------------------------

const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)$/i

export function parseSemver(version: string): [number, number, number] | null {
  const match = SEMVER_RE.exec(version.trim())
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/**
 * Compares two semver strings (with or without a leading "v").
 * Returns -1 if a < b, 0 if a === b, 1 if a > b.
 * An unparseable version is treated as older than any valid semver.
 */
export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a)
  const pb = parseSemver(b)
  if (!pa && !pb) return 0
  if (!pa) return -1
  if (!pb) return 1

  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1
    if (pa[i] > pb[i]) return 1
  }
  return 0
}

/**
 * Returns true when acceptance is required: either no version has been
 * accepted yet, or the accepted version is older than currentVersion.
 */
export function isTosAcceptanceRequired(
  acceptedVersion: string | null,
  currentVersion: string = CURRENT_TOS_VERSION,
): boolean {
  if (!acceptedVersion) return true
  return compareSemver(acceptedVersion, currentVersion) < 0
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function readStorage(): TosAcceptanceRecord {
  try {
    const raw = localStorage.getItem(TOS_STORAGE_KEY)
    if (!raw) return EMPTY_RECORD
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return EMPTY_RECORD
    const acceptedVersion =
      typeof parsed.acceptedVersion === 'string' && parseSemver(parsed.acceptedVersion)
        ? parsed.acceptedVersion
        : null
    const acceptedAt = typeof parsed.acceptedAt === 'string' ? parsed.acceptedAt : null
    if (!acceptedVersion) return EMPTY_RECORD
    return { acceptedVersion, acceptedAt }
  } catch {
    return EMPTY_RECORD
  }
}

function writeStorage(record: TosAcceptanceRecord): void {
  try {
    localStorage.setItem(TOS_STORAGE_KEY, JSON.stringify(record))
  } catch {
    // quota exceeded or private browsing — ignore
  }
}

// ---------------------------------------------------------------------------
// In-memory store + listeners
// ---------------------------------------------------------------------------

let state: TosAcceptanceRecord = readStorage()
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function getTosState(): TosAcceptanceRecord {
  return state
}

export function subscribeTos(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function acceptTos(
  version: string = CURRENT_TOS_VERSION,
  acceptedAt: string = new Date().toISOString(),
): TosAcceptanceRecord {
  state = {
    acceptedVersion: version,
    acceptedAt,
  }
  writeStorage(state)
  emit()
  return state
}

/**
 * Reloads in-memory state from localStorage. Useful in tests or when
 * storage is updated externally.
 */
export function hydrateTosStore(): TosAcceptanceRecord {
  state = readStorage()
  emit()
  return state
}

/**
 * Clears persisted acceptance and resets in-memory state.
 */
export function resetTosStore(): void {
  try {
    localStorage.removeItem(TOS_STORAGE_KEY)
  } catch {
    // ignore
  }
  state = EMPTY_RECORD
  emit()
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function useTosStore() {
  const snapshot = useSyncExternalStore(subscribeTos, getTosState, getTosState)
  const needsAcceptance = isTosAcceptanceRequired(snapshot.acceptedVersion, CURRENT_TOS_VERSION)

  return {
    acceptedVersion: snapshot.acceptedVersion,
    acceptedAt: snapshot.acceptedAt,
    currentVersion: CURRENT_TOS_VERSION,
    needsAcceptance,
    acceptTos,
  }
}
