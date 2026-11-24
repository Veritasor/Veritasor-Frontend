import { useEffect, useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SessionExpiryWarning } from './SessionExpiryWarning';
import { isAnnounceMilestone } from './sessionExpiryAnnouncements';

describe('SessionExpiryWarning', () => {
  it('returns null and does not render when isOpen is false', () => {
    const { container } = render(
      <SessionExpiryWarning
        isOpen={false}
        timeLeft={60}
        onExtendSession={() => {}}
        onReauth={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the warning with correct formatted time when isOpen is true', () => {
    render(
      <SessionExpiryWarning
        isOpen={true}
        timeLeft={65} // 1:05
        onExtendSession={() => {}}
        onReauth={() => {}}
      />
    );
    expect(screen.getByText('1:05')).toBeInTheDocument();
    expect(screen.getByText('Your session is about to expire')).toBeInTheDocument();
  });

  it('calls onExtendSession when Extend Session button is clicked', () => {
    const onExtendSession = vi.fn();
    render(
      <SessionExpiryWarning
        isOpen={true}
        timeLeft={60}
        onExtendSession={onExtendSession}
        onReauth={() => {}}
      />
    );
    
    fireEvent.click(screen.getByText('Extend Session'));
    expect(onExtendSession).toHaveBeenCalledTimes(1);
  });

  it('calls onReauth when Re-authenticate Now button is clicked', () => {
    const onReauth = vi.fn();
    render(
      <SessionExpiryWarning
        isOpen={true}
        timeLeft={60}
        onExtendSession={() => {}}
        onReauth={onReauth}
      />
    );
    
    fireEvent.click(screen.getByText('Re-authenticate Now'));
    expect(onReauth).toHaveBeenCalledTimes(1);
  });

  it('calls onExtendSession when backdrop is clicked', () => {
    const onExtendSession = vi.fn();
    const { container } = render(
      <SessionExpiryWarning
        isOpen={true}
        timeLeft={60}
        onExtendSession={onExtendSession}
        onReauth={() => {}}
      />
    );
    
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onExtendSession).toHaveBeenCalledTimes(1);
  });

  it('calls onExtendSession when Escape key is pressed', () => {
    const onExtendSession = vi.fn();
    render(
      <SessionExpiryWarning
        isOpen={true}
        timeLeft={60}
        onExtendSession={onExtendSession}
        onReauth={() => {}}
      />
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onExtendSession).toHaveBeenCalledTimes(1);
  });

  describe('countdown accessibility', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    /** Counts down one second per tick so fake timers can drive `timeLeft`. */
    const CountdownHarness = ({ start }: { start: number }) => {
      const [timeLeft, setTimeLeft] = useState(start);
      useEffect(() => {
        const id = setInterval(() => setTimeLeft((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(id);
      }, []);
      return (
        <SessionExpiryWarning
          isOpen
          timeLeft={timeLeft}
          onExtendSession={() => {}}
          onReauth={() => {}}
        />
      );
    };

    it('does not mark the ticking timer text as an assertive live region', () => {
      const { container } = render(
        <SessionExpiryWarning
          isOpen
          timeLeft={65}
          onExtendSession={() => {}}
          onReauth={() => {}}
        />
      );
      expect(container.querySelector('[aria-live="assertive"]')).toBeNull();
      const live = screen.getByTestId('session-expiry-announcement');
      expect(live).toHaveAttribute('aria-live', 'polite');
      expect(live).toHaveAttribute('aria-atomic', 'true');
    });

    it('announces on open, then only at defined milestones as time advances', () => {
      vi.useFakeTimers();
      render(<CountdownHarness start={125} />);
      const live = screen.getByTestId('session-expiry-announcement');

      // Announced once on open.
      expect(live).toHaveTextContent('Your session will expire in 2 minutes 5 seconds.');

      // Record every distinct announcement across the whole countdown.
      const seen: string[] = [live.textContent ?? ''];
      let changes = 0;
      for (let i = 0; i < 125; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
        const text = live.textContent ?? '';
        if (text !== seen[seen.length - 1]) {
          changes += 1;
          seen.push(text);
        }
      }

      // 125s -> 0s: milestones are 120, 60, 30 and 10 (plus the announcement on open).
      expect(changes).toBe(4);
      expect(seen).toEqual([
        'Your session will expire in 2 minutes 5 seconds.',
        'Your session will expire in 2 minutes.',
        'Your session will expire in 1 minute.',
        'Your session will expire in 30 seconds.',
        'Your session will expire in 10 seconds.',
      ]);
    });

    it('does not change the live region on non-milestone ticks', () => {
      vi.useFakeTimers();
      render(<CountdownHarness start={59} />);
      const live = screen.getByTestId('session-expiry-announcement');
      const initial = live.textContent;

      // 59 -> 45: no milestone crossed, so no new announcement.
      act(() => {
        vi.advanceTimersByTime(14_000);
      });
      expect(screen.getByText('0:45')).toBeInTheDocument(); // visible timer still ticks
      expect(live.textContent).toBe(initial);
    });

    it('identifies milestones correctly', () => {
      expect(isAnnounceMilestone(300)).toBe(true);
      expect(isAnnounceMilestone(60)).toBe(true);
      expect(isAnnounceMilestone(30)).toBe(true);
      expect(isAnnounceMilestone(10)).toBe(true);
      expect(isAnnounceMilestone(59)).toBe(false);
      expect(isAnnounceMilestone(45)).toBe(false);
      expect(isAnnounceMilestone(9)).toBe(false);
      expect(isAnnounceMilestone(0)).toBe(false);
    });

    it('moves focus to the Extend Session button when opened', () => {
      render(
        <SessionExpiryWarning
          isOpen
          timeLeft={60}
          onExtendSession={() => {}}
          onReauth={() => {}}
        />
      );
      expect(screen.getByRole('button', { name: 'Extend Session' })).toHaveFocus();
    });

    it('restores focus to the trigger when closed', () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      trigger.focus();

      const props = { timeLeft: 60, onExtendSession: () => {}, onReauth: () => {} };
      const { rerender } = render(<SessionExpiryWarning isOpen {...props} />);
      expect(screen.getByRole('button', { name: 'Extend Session' })).toHaveFocus();

      rerender(<SessionExpiryWarning isOpen={false} {...props} />);
      expect(trigger).toHaveFocus();
      trigger.remove();
    });

    it('traps focus between Extend Session and Re-authenticate Now', () => {
      render(
        <SessionExpiryWarning
          isOpen
          timeLeft={60}
          onExtendSession={() => {}}
          onReauth={() => {}}
        />
      );
      const extend = screen.getByRole('button', { name: 'Extend Session' });
      const reauth = screen.getByRole('button', { name: 'Re-authenticate Now' });

      reauth.focus();
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(extend).toHaveFocus();

      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(reauth).toHaveFocus();
    });
  });
});
