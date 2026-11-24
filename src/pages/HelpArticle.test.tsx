import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HelpArticle from './HelpArticle';

function renderWithSlug(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/help/${slug}`]}>
      <Routes>
        <Route path="/help/:slug" element={<HelpArticle />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('HelpArticle', () => {
  it('renders the help article content and feedback component', () => {
    renderWithSlug('getting-started');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Getting Started with Veritasor');
    expect(screen.getByText('Last updated: July 2026')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '1. Create a workspace' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '2. Add an attestation' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '3. Verify and share' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Was this helpful?' })).toBeInTheDocument();
  });

  it('renders "Article Not Found" for invalid slug', () => {
    renderWithSlug('invalid-slug');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Article Not Found');
  });

  it('renders different article content for different slugs', () => {
    renderWithSlug('api-keys');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Managing API Keys');
  });

  it('does not render a main landmark (uses div wrapper instead)', () => {
    renderWithSlug('getting-started');
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });

  it('renders an article element', () => {
    const { container } = renderWithSlug('getting-started');
    expect(container.querySelector('article')).toBeInTheDocument();
  });

  it('renders helpful/not-helpful buttons', () => {
    renderWithSlug('getting-started');
    expect(screen.getByRole('button', { name: /this article was helpful/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /this article was not helpful/i })).toBeInTheDocument();
  });

  it('clicking helpful shows submit button', () => {
    renderWithSlug('getting-started');
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }));
    expect(screen.getByRole('button', { name: /submit feedback/i })).toBeInTheDocument();
  });

  it('feedback submission shows thank you message', () => {
    renderWithSlug('getting-started');
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    expect(screen.getByText(/thanks for your feedback/i)).toBeInTheDocument();
  });

  it('clicking not helpful shows comment textarea', () => {
    renderWithSlug('getting-started');
    fireEvent.click(screen.getByRole('button', { name: /this article was not helpful/i }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});

// Deterministic with fake timers: Date.now() is frozen so the 60s
// rate-limit window does not advance between submissions.
describe('HelpArticle — async feedback', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

  it('handles feedback submission (success state transition)', () => {
    renderWithSlug('getting-started');
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/thanks for your feedback/i);
  });

  it('handles negative feedback with a valid comment', () => {
    renderWithSlug('getting-started');
    fireEvent.click(screen.getByRole('button', { name: /this article was not helpful/i }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Needs more detail on the onboarding step.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    expect(screen.getByText(/thanks for your feedback/i)).toBeInTheDocument();
  });

  it('handles invalid input: comment exceeds 500 characters', () => {
    renderWithSlug('getting-started');
    fireEvent.click(screen.getByRole('button', { name: /this article was not helpful/i }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'a'.repeat(501) },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/500 characters or fewer/i);
    expect(screen.queryByText(/thanks for your feedback/i)).not.toBeInTheDocument();
  });

  it('handles invalid input: rate limiting on submissions', () => {
    renderWithSlug('getting-started');
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));
    expect(screen.getByText(/thanks for your feedback/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /submit different feedback/i }));
    fireEvent.click(screen.getByRole('button', { name: /this article was helpful/i }));
    fireEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/please wait/i);
    expect(screen.queryByText(/thanks for your feedback/i)).not.toBeInTheDocument();
  });
});
