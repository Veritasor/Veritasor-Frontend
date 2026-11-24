/**
 * notificationsStore — shared, persisted in-app notifications & preferences store.
 *
 * Backed by localStorage so notifications and user preferences survive navigation
 * and page reload. Uses useSyncExternalStore so any subscribed component re-renders
 * on change.
 *
 * Honouring preferences: `addNotification` checks `preferences[category].inapp`
 * and returns `null` (producing no notification) when the category's in-app
 * channel is disabled.
 */

import { useSyncExternalStore } from 'react'
import { newId } from '../utils/secureRandom'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationChannel = 'email' | 'inapp' | 'webhook'

export type NotificationCategoryId =
  | 'attestation-completed'
  | 'attestation-failed'
  | 'source-connected'
  | 'source-disconnected'
  | 'invoice-generated'
  | 'payment-failed'
  | 'team-invite'
  | 'api-key-rotated'
  | 'security-alert'

export interface NotificationCategory {
  id: NotificationCategoryId
  title: string
  description: string
  defaults: Record<NotificationChannel, boolean>
}

export type NotificationPreferences = Record<
  NotificationCategoryId,
  Record<NotificationChannel, boolean>
>

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error'

export interface InAppNotification {
  id: string
  category: NotificationCategoryId
  title: string
  message: string
  severity: NotificationSeverity
  createdAt: string
  read: boolean
  actionHref?: string
}

export interface AddNotificationInput {
  category: NotificationCategoryId
  title: string
  message: string
  severity?: NotificationSeverity
  actionHref?: string
}

// ---------------------------------------------------------------------------
// Category metadata & defaults
// ---------------------------------------------------------------------------

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: 'attestation-completed',
    title: 'Attestation completed',
    description:
      'A revenue attestation run finished successfully with a valid Merkle root.',
    defaults: { email: true, inapp: true, webhook: true },
  },
  {
    id: 'attestation-failed',
    title: 'Attestation failed',
    description:
      'An attestation run timed out, returned an error, or produced invalid evidence.',
    defaults: { email: true, inapp: true, webhook: true },
  },
  {
    id: 'source-connected',
    title: 'Revenue source connected',
    description:
      'A new data source (Stripe, QuickBooks, Plaid, etc.) was linked to the workspace.',
    defaults: { email: true, inapp: true, webhook: false },
  },
  {
    id: 'source-disconnected',
    title: 'Revenue source disconnected',
    description:
      'A previously connected data source lost authorization or was removed by a team member.',
    defaults: { email: true, inapp: true, webhook: true },
  },
  {
    id: 'invoice-generated',
    title: 'Billing invoice generated',
    description:
      'A new subscription invoice is ready. Receipts are also available in Billing.',
    defaults: { email: true, inapp: false, webhook: false },
  },
  {
    id: 'payment-failed',
    title: 'Payment failed',
    description:
      'A subscription charge could not be processed. Service may be interrupted.',
    defaults: { email: true, inapp: true, webhook: true },
  },
  {
    id: 'team-invite',
    title: 'Team member invite or removal',
    description:
      'Someone was invited to the workspace, accepted, or was removed by an admin.',
    defaults: { email: true, inapp: true, webhook: false },
  },
  {
    id: 'api-key-rotated',
    title: 'API key rotated or revoked',
    description:
      'A workspace API key was rotated, revoked, or is about to expire.',
    defaults: { email: true, inapp: true, webhook: true },
  },
  {
    id: 'security-alert',
    title: 'Security alerts',
    description:
      'Sign-in from a new device, MFA method changes, or recovery code usage.',
    defaults: { email: true, inapp: true, webhook: true },
  },
]

export const CHANNEL_META: Record<
  NotificationChannel,
  { label: string; icon: string; help: string }
> = {
  email: {
    label: 'Email',
    icon: '✉',
    help: 'Delivered to your verified inbox with reply-to support.',
  },
  inapp: {
    label: 'In-app',
    icon: '🔔',
    help: 'Shown in the product bell menu and marked as read/unread.',
  },
  webhook: {
    label: 'Webhook',
    icon: '🔗',
    help: 'POST event payload to the configured endpoint URL.',
  },
}

const VALID_CATEGORY_IDS = new Set<string>(NOTIFICATION_CATEGORIES.map((c) => c.id))
const VALID_SEVERITIES = new Set<string>(['info', 'success', 'warning', 'error'])

export function buildInitialPrefs(): NotificationPreferences {
  const prefs = {} as NotificationPreferences
  for (const cat of NOTIFICATION_CATEGORIES) {
    prefs[cat.id] = { ...cat.defaults }
  }
  return prefs
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

export const INITIAL_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'notif-001',
    category: 'attestation-completed',
    title: 'Attestation completed',
    message: 'June 2026 revenue attestation verified with a valid Merkle root.',
    severity: 'success',
    createdAt: '2026-06-01T14:05:00Z',
    read: false,
    actionHref: '/attestations',
  },
  {
    id: 'notif-002',
    category: 'source-disconnected',
    title: 'QuickBooks token expired',
    message: 'Re-authorize QuickBooks to resume automatic revenue sync.',
    severity: 'warning',
    createdAt: '2026-05-30T09:15:00Z',
    read: false,
    actionHref: '/sources',
  },
  {
    id: 'notif-003',
    category: 'api-key-rotated',
    title: 'API key rotated',
    message: 'Production key ending in 3f9a was rotated by an admin.',
    severity: 'info',
    createdAt: '2026-05-28T16:40:00Z',
    read: true,
    actionHref: '/api-keys',
  },
]

// ---------------------------------------------------------------------------
// Storage keys & schema validation
// ---------------------------------------------------------------------------

const NOTIFICATIONS_STORAGE_KEY = 'veritasor-notifications-v1'
const PREFS_STORAGE_KEY = 'veritasor-notification-prefs-v1'
export const NOTIFICATIONS_SCHEMA_VERSION = 1

interface PersistedNotifications {
  version: number
  notifications: InAppNotification[]
}

interface PersistedPrefs {
  version: number
  preferences: NotificationPreferences
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isValidNotification(v: unknown): v is InAppNotification {
  if (!isRecord(v)) return false
  return (
    typeof v.id === 'string' &&
    typeof v.category === 'string' &&
    VALID_CATEGORY_IDS.has(v.category) &&
    typeof v.title === 'string' &&
    typeof v.message === 'string' &&
    typeof v.severity === 'string' &&
    VALID_SEVERITIES.has(v.severity) &&
    typeof v.createdAt === 'string' &&
    typeof v.read === 'boolean' &&
    (v.actionHref === undefined || typeof v.actionHref === 'string')
  )
}

function readNotificationsStorage(): InAppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)
    if (raw === null) return INITIAL_NOTIFICATIONS
    const parsed: unknown = JSON.parse(raw)
    if (
      isRecord(parsed) &&
      parsed.version === NOTIFICATIONS_SCHEMA_VERSION &&
      Array.isArray(parsed.notifications) &&
      parsed.notifications.every(isValidNotification)
    ) {
      return parsed.notifications
    }
    return INITIAL_NOTIFICATIONS
  } catch {
    return INITIAL_NOTIFICATIONS
  }
}

function writeNotificationsStorage(notifications: InAppNotification[]): void {
  try {
    const payload: PersistedNotifications = {
      version: NOTIFICATIONS_SCHEMA_VERSION,
      notifications,
    }
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // quota exceeded or private browsing — ignore
  }
}

function normalizePrefs(raw: unknown): NotificationPreferences {
  const base = buildInitialPrefs()
  if (!isRecord(raw)) return base
  for (const cat of NOTIFICATION_CATEGORIES) {
    const entry = raw[cat.id]
    if (isRecord(entry)) {
      base[cat.id] = {
        email: typeof entry.email === 'boolean' ? entry.email : cat.defaults.email,
        inapp: typeof entry.inapp === 'boolean' ? entry.inapp : cat.defaults.inapp,
        webhook:
          typeof entry.webhook === 'boolean' ? entry.webhook : cat.defaults.webhook,
      }
    }
  }
  return base
}

function readPrefsStorage(): NotificationPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY)
    if (raw === null) return buildInitialPrefs()
    const parsed: unknown = JSON.parse(raw)
    if (
      isRecord(parsed) &&
      parsed.version === NOTIFICATIONS_SCHEMA_VERSION &&
      'preferences' in parsed
    ) {
      return normalizePrefs(parsed.preferences)
    }
    return buildInitialPrefs()
  } catch {
    return buildInitialPrefs()
  }
}

function writePrefsStorage(preferences: NotificationPreferences): void {
  try {
    const payload: PersistedPrefs = {
      version: NOTIFICATIONS_SCHEMA_VERSION,
      preferences,
    }
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // quota exceeded or private browsing — ignore
  }
}

// ---------------------------------------------------------------------------
// External store
// ---------------------------------------------------------------------------

interface NotificationsState {
  notifications: InAppNotification[]
  preferences: NotificationPreferences
}

let state: NotificationsState = {
  notifications: readNotificationsStorage(),
  preferences: readPrefsStorage(),
}

const SERVER_SNAPSHOT: NotificationsState = {
  notifications: INITIAL_NOTIFICATIONS,
  preferences: buildInitialPrefs(),
}

const listeners = new Set<() => void>()

function getSnapshot(): NotificationsState {
  return state
}

function getServerSnapshot(): NotificationsState {
  return SERVER_SNAPSHOT
}

function notify(): void {
  for (const l of listeners) l()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function updateNotifications(next: InAppNotification[]): void {
  state = { ...state, notifications: next }
  writeNotificationsStorage(next)
  notify()
}

function updatePreferences(next: NotificationPreferences): void {
  state = { ...state, preferences: next }
  writePrefsStorage(next)
  notify()
}

// ---------------------------------------------------------------------------
// Public imperative API
// ---------------------------------------------------------------------------

export function getNotifications(): InAppNotification[] {
  return state.notifications
}

export function getUnreadCount(): number {
  return state.notifications.filter((n) => !n.read).length
}

export function getNotificationPrefs(): NotificationPreferences {
  return state.preferences
}

export function isCategoryEnabled(
  category: NotificationCategoryId,
  channel: NotificationChannel = 'inapp',
): boolean {
  return Boolean(state.preferences[category]?.[channel])
}

/**
 * Adds a new in-app notification if and only if the category's `inapp`
 * preference is enabled. Returns the created notification, or `null` when
 * suppressed by preferences.
 */
export function addNotification(
  input: AddNotificationInput,
): InAppNotification | null {
  if (!isCategoryEnabled(input.category, 'inapp')) {
    return null
  }
  const notification: InAppNotification = {
    id: newId('notif'),
    category: input.category,
    title: input.title,
    message: input.message,
    severity: input.severity ?? 'info',
    createdAt: new Date().toISOString(),
    read: false,
    ...(input.actionHref ? { actionHref: input.actionHref } : {}),
  }
  updateNotifications([notification, ...state.notifications])
  return notification
}

export function markAsRead(id: string): void {
  let changed = false
  const next = state.notifications.map((n) => {
    if (n.id === id && !n.read) {
      changed = true
      return { ...n, read: true }
    }
    return n
  })
  if (changed) updateNotifications(next)
}

export function markAllAsRead(): void {
  if (!state.notifications.some((n) => !n.read)) return
  updateNotifications(state.notifications.map((n) => (n.read ? n : { ...n, read: true })))
}

export function dismissNotification(id: string): void {
  const next = state.notifications.filter((n) => n.id !== id)
  if (next.length !== state.notifications.length) {
    updateNotifications(next)
  }
}

export function clearNotifications(): void {
  if (state.notifications.length === 0) return
  updateNotifications([])
}

export function setNotificationPref(
  category: NotificationCategoryId,
  channel: NotificationChannel,
  enabled: boolean,
): void {
  const current = state.preferences[category]
  if (!current || current[channel] === enabled) return
  const next: NotificationPreferences = {
    ...state.preferences,
    [category]: {
      ...current,
      [channel]: enabled,
    },
  }
  updatePreferences(next)
}

export function setNotificationPrefs(prefs: NotificationPreferences): void {
  updatePreferences(normalizePrefs(prefs))
}

export function resetNotificationPrefs(): void {
  updatePreferences(buildInitialPrefs())
}

/**
 * Resets the store to a known state (intended for tests).
 */
export function resetNotificationsStore(
  notifications: InAppNotification[] = INITIAL_NOTIFICATIONS,
  preferences: NotificationPreferences = buildInitialPrefs(),
): void {
  state = {
    notifications: notifications.map((n) => ({ ...n })),
    preferences: normalizePrefs(preferences),
  }
  writeNotificationsStorage(state.notifications)
  writePrefsStorage(state.preferences)
  notify()
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function useNotifications() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const unreadCount = snapshot.notifications.reduce(
    (acc, n) => (n.read ? acc : acc + 1),
    0,
  )
  return {
    notifications: snapshot.notifications,
    unreadCount,
    preferences: snapshot.preferences,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearNotifications,
    setPreference: setNotificationPref,
    setPreferences: setNotificationPrefs,
    resetPreferences: resetNotificationPrefs,
    isCategoryEnabled,
  }
}
