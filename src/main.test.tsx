import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'

const mocks = vi.hoisted(() => ({
  createRoot: vi.fn(() => ({ render: vi.fn() })),
  registerErrorListeners: vi.fn(() => vi.fn()),
}))

vi.mock('react-dom/client', () => ({ createRoot: mocks.createRoot }))
vi.mock('./App', () => ({ default: () => null }))
vi.mock('./components/EnvironmentContext', () => ({
  EnvironmentProvider: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('./utils/errorReporting', () => ({
  registerErrorListeners: mocks.registerErrorListeners,
  clearErrorThrottle: vi.fn(),
}))

describe('main entry point', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.resetModules()
    mocks.createRoot.mockClear()
    mocks.registerErrorListeners.mockClear()
  })

  it('creates the app root and renders App inside StrictMode', async () => {
    document.body.innerHTML = '<div id="root"></div>'

    await import('./main')
    const [{ StrictMode }, { EnvironmentProvider }, { default: App }] = await Promise.all([
      import('react'),
      import('./components/EnvironmentContext'),
      import('./App'),
    ])

    expect(mocks.registerErrorListeners).toHaveBeenCalledOnce()
    expect(mocks.createRoot).toHaveBeenCalledOnce()
    expect(mocks.createRoot).toHaveBeenCalledWith(document.getElementById('root'))

    const render = mocks.createRoot.mock.results[0]?.value.render
    expect(render).toHaveBeenCalledOnce()

    const strictModeElement = render.mock.calls[0]?.[0]
    expect(strictModeElement.type).toBe(StrictMode)

    const envProviderElement = strictModeElement.props.children
    expect(envProviderElement.type).toBe(EnvironmentProvider)

    const appElement = envProviderElement.props.children
    expect(appElement.type).toBe(App)
  })

  it('throws a deterministic error when the root element is missing', async () => {
    await expect(import('./main')).rejects.toThrow('Root element "#root" was not found.')
    expect(mocks.registerErrorListeners).not.toHaveBeenCalled()
    expect(mocks.createRoot).not.toHaveBeenCalled()
  })

  it('bootstraps successfully when the root is added after a missing-root failure', async () => {
    await expect(import('./main')).rejects.toThrow('Root element "#root" was not found.')

    document.body.innerHTML = '<div id="root"></div>'
    vi.resetModules()
    await import('./main')

    expect(mocks.registerErrorListeners).toHaveBeenCalledOnce()
    expect(mocks.createRoot).toHaveBeenCalledOnce()
    expect(mocks.createRoot).toHaveBeenCalledWith(document.getElementById('root'))
    expect(mocks.createRoot.mock.results[0]?.value.render).toHaveBeenCalledOnce()
  })
})
