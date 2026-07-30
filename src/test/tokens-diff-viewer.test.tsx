import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TokensDiffViewer, { getTokenDiff } from '../components/tokens/TokensDiffViewer'

describe('getTokenDiff', () => {
  it('reports added, changed, and removed tokens', () => {
    const diff = getTokenDiff(
      [{ name: '--old', category: 'Color', value: '#000' }, { name: '--change', category: 'Color', value: '#111' }],
      [{ name: '--change', category: 'Color', value: '#222' }, { name: '--new', category: 'Spacing', value: '1rem' }],
    )
    expect(diff.map(({ name, status }) => [name, status])).toEqual([['--change', 'Changed'], ['--new', 'Added'], ['--old', 'Removed']])
  })
})

describe('TokensDiffViewer', () => {
  it('renders status chips and side-by-side value swatches', () => {
    render(<TokensDiffViewer />)
    expect(screen.getByRole('heading', { name: /compare theme tokens/i })).toBeInTheDocument()
    expect(screen.getAllByText('Added')).not.toHaveLength(0)
    expect(screen.getAllByText('Changed')).not.toHaveLength(0)
    expect(screen.getAllByText('Removed')).not.toHaveLength(0)
    expect(screen.getByRole('img', { name: /earlier value for --color-brand/i })).toBeInTheDocument()
  })

  it('filters differences by category with a labelled native control', () => {
    render(<TokensDiffViewer />)
    fireEvent.change(screen.getByRole('combobox', { name: /filter diff by token category/i }), { target: { value: 'Radius' } })
    expect(screen.getByText('--radius-card')).toBeInTheDocument()
    expect(screen.getByText('--radius-pill')).toBeInTheDocument()
    expect(screen.queryByText('--color-brand')).not.toBeInTheDocument()
  })

  it('announces an empty filtered result', () => {
    render(<TokensDiffViewer />)
    fireEvent.change(screen.getByRole('combobox', { name: /earlier theme version/i }), { target: { value: '2.4' } })
    expect(screen.getByText(/no differences match this category/i)).toBeInTheDocument()
  })
})
