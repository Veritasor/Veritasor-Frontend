import { describe, it, expect, beforeEach } from 'vitest'
import {
  addNotification,
  buildInitialPrefs,
  clearNotifications,
  dismissNotification,
  getNotificationPrefs,
  getNotifications,
  getUnreadCount,
  isCategoryEnabled,
  markAllAsRead,
  markAsRead,
  resetNotificationPrefs,
  resetNotificationsStore,
  setNotificationPref,
} from './notificationsStore'

describe('notificationsStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetNotificationsStore([], buildInitialPrefs())
  })

  it('builds initial preferences matching category defaults', () => {
    const prefs = buildInitialPrefs()
    expect(prefs['attestation-completed'].inapp).toBe(true)
    expect(prefs['invoice-generated'].inapp).toBe(false)
    expect(prefs['invoice-generated'].email).toBe(true)
  })

  it('adds a notification when the category in-app preference is enabled', () => {
    const created = addNotification({
      category: 'attestation-completed',
      title: 'Run succeeded',
      message: 'Merkle root verified.',
      severity: 'success',
    })

    expect(created).not.toBeNull()
    expect(getNotifications()).toHaveLength(1)
    expect(getUnreadCount()).toBe(1)
  })

  it('produces no notification when the category in-app preference is disabled by default', () => {
    const created = addNotification({
      category: 'invoice-generated',
      title: 'Invoice ready',
      message: 'June invoice is ready.',
    })

    expect(created).toBeNull()
    expect(getNotifications()).toHaveLength(0)
    expect(getUnreadCount()).toBe(0)
  })

  it('produces no notification when a category is disabled via setNotificationPref', () => {
    setNotificationPref('attestation-completed', 'inapp', false)
    expect(isCategoryEnabled('attestation-completed', 'inapp')).toBe(false)

    const created = addNotification({
      category: 'attestation-completed',
      title: 'Suppressed run',
      message: 'Should not appear.',
    })

    expect(created).toBeNull()
    expect(getNotifications()).toHaveLength(0)
  })

  it('produces a notification after re-enabling a previously disabled category', () => {
    setNotificationPref('invoice-generated', 'inapp', true)
    const created = addNotification({
      category: 'invoice-generated',
      title: 'Invoice ready',
      message: 'Now enabled.',
    })

    expect(created).not.toBeNull()
    expect(getNotifications()).toHaveLength(1)
  })

  it('marks individual and all notifications as read', () => {
    const first = addNotification({
      category: 'attestation-completed',
      title: 'First',
      message: 'First message',
    })
    addNotification({
      category: 'security-alert',
      title: 'Second',
      message: 'Second message',
    })

    expect(getUnreadCount()).toBe(2)

    markAsRead(first!.id)
    expect(getUnreadCount()).toBe(1)

    markAllAsRead()
    expect(getUnreadCount()).toBe(0)
  })

  it('dismisses a single notification and clears all notifications', () => {
    const first = addNotification({
      category: 'attestation-completed',
      title: 'First',
      message: 'First message',
    })
    addNotification({
      category: 'security-alert',
      title: 'Second',
      message: 'Second message',
    })

    dismissNotification(first!.id)
    expect(getNotifications()).toHaveLength(1)
    expect(getNotifications()[0].title).toBe('Second')

    clearNotifications()
    expect(getNotifications()).toHaveLength(0)
  })

  it('resets preferences back to defaults', () => {
    setNotificationPref('attestation-completed', 'inapp', false)
    expect(getNotificationPrefs()['attestation-completed'].inapp).toBe(false)

    resetNotificationPrefs()
    expect(getNotificationPrefs()['attestation-completed'].inapp).toBe(true)
  })
})
