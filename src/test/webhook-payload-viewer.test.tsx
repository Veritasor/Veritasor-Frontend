import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import JsonTreeViewer, { JsonTreeNode } from '../components/webhooks/JsonTreeViewer'
import WebhookPayloadViewer, { SAMPLE_WEBHOOK_EVENTS } from '../components/webhooks/WebhookPayloadViewer'

describe('JsonTreeViewer & JsonTreeNode', () => {
  const sampleData = {
    name: 'Veritasor',
    count: 42,
    active: true,
    details: null,
    items: ['alpha', 'beta'],
  }

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    })
  })

  it('renders primitive values and keys correctly', () => {
    render(<JsonTreeViewer data={sampleData} />)
    expect(screen.getByText(/"name":/i)).toBeInTheDocument()
    expect(screen.getByText(/"Veritasor"/i)).toBeInTheDocument()
    expect(screen.getByText(/42/i)).toBeInTheDocument()
    expect(screen.getByText(/true/i)).toBeInTheDocument()
    expect(screen.getByText(/null/i)).toBeInTheDocument()
  })

  it('expands and collapses objects when expand toggle button is clicked', () => {
    render(<JsonTreeNode data={{ nested: { a: 1 } }} depth={0} defaultExpandedDepth={1} />)
    const toggleButton = screen.getByRole('button', { name: /expand node "nested"/i })
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(toggleButton)
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/"a":/i)).toBeInTheDocument()
  })

  it('handles keyboard navigation (Enter, ArrowRight, ArrowLeft) on expandable nodes', () => {
    render(<JsonTreeNode data={{ nested: { a: 1 } }} depth={0} defaultExpandedDepth={1} />)
    const toggleButton = screen.getByRole('button', { name: /expand node "nested"/i })

    // ArrowRight expands
    fireEvent.keyDown(toggleButton, { key: 'ArrowRight' })
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true')

    // ArrowLeft collapses
    fireEvent.keyDown(toggleButton, { key: 'ArrowLeft' })
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false')

    // Enter toggles
    fireEvent.keyDown(toggleButton, { key: 'Enter' })
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true')
  })

  it('copies per-node data to clipboard on copy button click', async () => {
    render(<JsonTreeNode label="count" data={42} />)
    const copyButton = screen.getByRole('button', { name: /copy value for count/i })
    fireEvent.click(copyButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('42')
    await waitFor(() => {
      expect(screen.getByText(/✓ Copied/i)).toBeInTheDocument()
    })
  })
})

describe('WebhookPayloadViewer', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    })
  })

  it('renders heading and controls', () => {
    render(<WebhookPayloadViewer />)
    expect(screen.getByText(/Webhook Payload Viewer/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /select webhook event sample/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /download.*payload as file/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy full payload/i })).toBeInTheDocument()
  })

  it('changes selected event when dropdown option changes', () => {
    render(<WebhookPayloadViewer />)
    const select = screen.getByRole('combobox', { name: /select webhook event sample/i })
    fireEvent.change(select, { target: { value: SAMPLE_WEBHOOK_EVENTS[1].id } })

    expect(screen.getByText(SAMPLE_WEBHOOK_EVENTS[1].description)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /download source\.connected payload as file/i })).toBeInTheDocument()
  })

  it('copies full JSON payload when "Copy full JSON" button is clicked', async () => {
    render(<WebhookPayloadViewer />)
    const copyAllBtn = screen.getByRole('button', { name: /copy full payload/i })
    fireEvent.click(copyAllBtn)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      JSON.stringify(SAMPLE_WEBHOOK_EVENTS[0].payload, null, 2),
    )
    await waitFor(() => {
      expect(screen.getByText(/✓ Copied full JSON/i)).toBeInTheDocument()
    })
  })

  it('toggles collapse all and expand all tree depth', () => {
    render(<WebhookPayloadViewer />)
    const collapseAllBtn = screen.getByRole('button', { name: /collapse tree to root level/i })
    const expandAllBtn = screen.getByRole('button', { name: /expand all tree levels/i })

    fireEvent.click(collapseAllBtn)
    fireEvent.click(expandAllBtn)
    expect(screen.getByText(/Webhook Payload Viewer/i)).toBeInTheDocument()
  })
})
