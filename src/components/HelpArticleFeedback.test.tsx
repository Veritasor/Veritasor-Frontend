import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, act } from '@testing-library/react'
import HelpArticleFeedback from './HelpArticleFeedback'

function renderComponent(props = {}) {
  return render(<HelpArticleFeedback {...props} />)
}

describe('HelpArticleFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('renders the heading', () => {
    renderComponent()
    expect(screen.getByText('Was this helpful?')).toBeInTheDocument()
  })

  it('renders both thumbs buttons', () => {
    renderComponent()
    expect(screen.getByRole('button', { name: /this article was helpful/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /this article was not helpful/i })).toBeInTheDocument()
  })

  it('sets rating to up when helpful button is clicked', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }))
    expect(screen.getByRole('button', { name: /this article was helpful/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sets rating to down when not helpful button is clicked', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was not helpful/i }))
    expect(screen.getByRole('button', { name: /this article was not helpful/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows textarea when down is selected', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was not helpful/i }))
    expect(screen.getByLabelText(/any additional thoughts/i)).toBeInTheDocument()
    expect(screen.getByText('(optional)')).toBeInTheDocument()
  })

  it('does not show textarea when up is selected', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }))
    expect(screen.queryByLabelText(/any additional thoughts/i)).not.toBeInTheDocument()
  })

  it('shows submit button after rating is selected', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }))
    expect(screen.getByRole('button', { name: /submit feedback/i })).toBeInTheDocument()
  })

  it('does not show submit button before rating is selected', () => {
    renderComponent()
    expect(screen.queryByRole('button', { name: /submit feedback/i })).not.toBeInTheDocument()
  })

  it('calls onSubmit with rating up and empty comment', () => {
    const onSubmit = vi.fn()
    renderComponent({ onSubmit })
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(onSubmit).toHaveBeenCalledWith('up', '')
  })

  it('calls onSubmit with rating down and comment', () => {
    const onSubmit = vi.fn()
    renderComponent({ onSubmit })
    fireEvent.click(screen.getByRole('button', { name: /this article was not helpful/i }))
    fireEvent.change(screen.getByLabelText(/any additional thoughts/i), { target: { value: 'Too long' } })
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(onSubmit).toHaveBeenCalledWith('down', 'Too long')
  })

  it('shows thanks confirmation after submit', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(screen.getByText('Thanks for your feedback!')).toBeInTheDocument()
  })

  it('has status region after submit', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows reset button after submit', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(screen.getByRole('button', { name: /submit different feedback/i })).toBeInTheDocument()
  })

  it('resets form when reset button is clicked', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was not helpful/i }))
    fireEvent.change(screen.getByLabelText(/any additional thoughts/i), { target: { value: 'Too long' } })
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit different feedback/i }))
    expect(screen.getByText('Was this helpful?')).toBeInTheDocument()
    expect(screen.queryByLabelText(/any additional thoughts/i)).not.toBeInTheDocument()
  })

  it('shows rate limit error when submitting too quickly', () => {
    const onSubmit = vi.fn()
    renderComponent({ onSubmit })
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    act(() => {
      vi.advanceTimersByTime(0)
    })
    fireEvent.click(screen.getByRole('button', { name: /submit different feedback/i }))
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }))
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('shows character limit error for comments over 500 chars', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was not helpful/i }))
    const textarea = screen.getByLabelText(/any additional thoughts/i)
    fireEvent.change(textarea, { target: { value: 'a'.repeat(501) } })
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows character count in hint', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was not helpful/i }))
    const textarea = screen.getByLabelText(/any additional thoughts/i)
    fireEvent.change(textarea, { target: { value: 'hello' } })
    expect(screen.getByText('5/500 characters')).toBeInTheDocument()
  })

  it('has proper ARIA attributes on buttons initially', () => {
    renderComponent()
    const upBtn = screen.getByRole('button', { name: /this article was helpful/i })
    const downBtn = screen.getByRole('button', { name: /this article was not helpful/i })
    expect(upBtn).toHaveAttribute('aria-pressed', 'false')
    expect(downBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('disables rating buttons after submit', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }))
    expect(screen.getByRole('button', { name: /this article was helpful/i })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }))
    expect(screen.queryByRole('button', { name: /this article was helpful/i })).not.toBeInTheDocument()
  })

  it('applies articleId as data attribute', () => {
    renderComponent({ articleId: 'test-article' })
    const section = document.querySelector('[data-article-id]')
    expect(section).toHaveAttribute('data-article-id', 'test-article')
  })

  it('renders with default articleId', () => {
    renderComponent()
    const section = document.querySelector('[data-article-id]')
    expect(section).toHaveAttribute('data-article-id', 'help-article')
  })

  it('focuses textarea when down is selected', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was not helpful/i }))
    expect(screen.getByLabelText(/any additional thoughts/i)).toHaveFocus()
  })

  it('renders a form element', () => {
    renderComponent()
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }))
    expect(document.querySelector('form.help-feedback-form')).toBeInTheDocument()
  })

  it('has grouped rating buttons with correct aria-label', () => {
    renderComponent()
    const group = screen.getByRole('group', { name: /rate this article/i })
    expect(group).toBeInTheDocument()
  })
})