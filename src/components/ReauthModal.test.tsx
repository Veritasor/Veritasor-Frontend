import { useState } from 'react';
import { render, screen, fireEvent, createEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ReauthModal } from './ReauthModal';

/**
 * Tests for ReauthModal (spec: docs/uiux/session-expiry-reauth.md).
 *
 * The modal does not verify credentials itself. It calls `onSuccess()` (with
 * no arguments) for any non-empty password and the parent decides what that
 * means; a failed verification is reported back through the `error` prop. The
 * "valid / invalid password" tests below cover exactly that contract.
 */

type Props = React.ComponentProps<typeof ReauthModal>;

function setup(overrides: Partial<Props> = {}) {
  const onSuccess = vi.fn();
  const onClose = vi.fn();
  const props: Props = { isOpen: true, onSuccess, onClose, ...overrides };
  const utils = render(<ReauthModal {...props} />);
  return { onSuccess, onClose, props, ...utils };
}

const passwordInput = () => screen.getByLabelText('Password') as HTMLInputElement;
const continueButton = () => screen.getByRole('button', { name: 'Continue' });
const cancelButton = () => screen.getByRole('button', { name: 'Cancel' });
const closeButton = () => screen.getByRole('button', { name: 'Close dialog' });
const backdrop = (container: HTMLElement) => container.querySelector('.modal-backdrop') as HTMLElement;

/**
 * Opens the modal and waits for its initial focus move (a setTimeout(0) in the
 * component) to land on the password field, so a test that then moves focus by
 * hand is not overridden by that pending timer.
 */
async function setupSettled(overrides: Partial<Props> = {}) {
  const utils = setup(overrides);
  await waitFor(() => expect(passwordInput()).toHaveFocus());
  return utils;
}

function pressKey(key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  document.dispatchEvent(event);
  return event;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReauthModal', () => {
  describe('rendering', () => {
    it('renders nothing when closed', () => {
      const { container } = setup({ isOpen: false });
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders the title, description, password field and both actions when open', () => {
      setup();
      expect(
        screen.getByRole('heading', { level: 2, name: 'Please re-authenticate to continue' })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Your session has expired or requires re-authentication/)
      ).toBeInTheDocument();
      expect(passwordInput()).toBeInTheDocument();
      expect(continueButton()).toBeInTheDocument();
      expect(cancelButton()).toBeInTheDocument();
      expect(closeButton()).toBeInTheDocument();
    });

    it('renders the password field as a required, empty, current-password input', () => {
      setup();
      const input = passwordInput();
      expect(input).toHaveAttribute('type', 'password');
      expect(input).toBeRequired();
      expect(input).toHaveAttribute('autocomplete', 'current-password');
      expect(input).toHaveValue('');
      expect(input).toBeEnabled();
    });

    it('does not show an error alert by default', () => {
      setup();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('appears and disappears as isOpen changes', () => {
      const { rerender, props } = setup({ isOpen: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(<ReauthModal {...props} isOpen />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(<ReauthModal {...props} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('submit: valid password path', () => {
    it('disables Continue until a password is entered', async () => {
      const user = userEvent.setup();
      setup();
      expect(continueButton()).toBeDisabled();

      await user.type(passwordInput(), 'a');
      expect(continueButton()).toBeEnabled();

      await user.clear(passwordInput());
      expect(continueButton()).toBeDisabled();
    });

    it('calls onSuccess once when Continue is clicked with a password', async () => {
      const user = userEvent.setup();
      const { onSuccess, onClose } = setup();

      await user.type(passwordInput(), 'correct horse battery staple');
      await user.click(continueButton());

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('submits when Enter is pressed in the password field', async () => {
      const user = userEvent.setup();
      const { onSuccess } = setup();

      await user.type(passwordInput(), 'hunter2{Enter}');

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('calls onSuccess with no arguments, so the password is never handed to the parent', async () => {
      const user = userEvent.setup();
      const { onSuccess } = setup();

      await user.type(passwordInput(), 'hunter2');
      await user.click(continueButton());

      expect(onSuccess).toHaveBeenCalledWith();
    });

    it('prevents the native form submission', () => {
      setup();
      const form = document.getElementById('reauth-form') as HTMLFormElement;
      fireEvent.change(passwordInput(), { target: { value: 'hunter2' } });

      const submit = createEvent.submit(form);
      fireEvent(form, submit);

      expect(submit.defaultPrevented).toBe(true);
    });

    it('treats a whitespace-only password as non-empty because the value is not trimmed', async () => {
      const user = userEvent.setup();
      const { onSuccess } = setup();

      await user.type(passwordInput(), '   ');
      await user.click(continueButton());

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('submit: invalid password path', () => {
    it('does not call onSuccess when the form is submitted with an empty password', () => {
      const { onSuccess } = setup();
      const form = document.getElementById('reauth-form') as HTMLFormElement;

      const submit = createEvent.submit(form);
      fireEvent(form, submit);

      expect(onSuccess).not.toHaveBeenCalled();
      expect(submit.defaultPrevented).toBe(true);
    });

    it('does not call onSuccess when Enter is pressed on an empty field', async () => {
      const user = userEvent.setup();
      const { onSuccess } = setup();

      await user.type(passwordInput(), '{Enter}');

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('does not call onSuccess when the disabled Continue button is clicked', async () => {
      const user = userEvent.setup();
      const { onSuccess } = setup();

      await user.click(continueButton());

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('shows the parent-supplied error as an alert and keeps the dialog open', () => {
      const { onClose, onSuccess } = setup({ error: 'Incorrect password. Try again.' });

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Incorrect password. Try again.');
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('keeps what the user typed when an error arrives, so they can correct it', async () => {
      const user = userEvent.setup();
      const { rerender, props } = setup();

      await user.type(passwordInput(), 'wrong-password');
      rerender(<ReauthModal {...props} error="Incorrect password." />);

      expect(screen.getByRole('alert')).toHaveTextContent('Incorrect password.');
      expect(passwordInput()).toHaveValue('wrong-password');
      expect(continueButton()).toBeEnabled();
    });

    it('allows another attempt after an error', async () => {
      const user = userEvent.setup();
      const { onSuccess } = setup({ error: 'Incorrect password.' });

      await user.type(passwordInput(), 'second-try');
      await user.click(continueButton());

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('removes the alert when the error is cleared', () => {
      const { rerender, props } = setup({ error: 'Incorrect password.' });
      expect(screen.getByRole('alert')).toBeInTheDocument();

      rerender(<ReauthModal {...props} error={null} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not render an empty alert for an empty error string', () => {
      setup({ error: '' });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('clears the typed password when the dialog is closed and reopened', async () => {
      const user = userEvent.setup();
      const { rerender, props } = setup();

      await user.type(passwordInput(), 'leftover-secret');
      rerender(<ReauthModal {...props} isOpen={false} />);
      rerender(<ReauthModal {...props} isOpen />);

      expect(passwordInput()).toHaveValue('');
      expect(continueButton()).toBeDisabled();
    });
  });

  describe('loading state', () => {
    it('shows "Verifying..." on the confirm button and marks it busy', () => {
      setup({ isLoading: true });
      const button = screen.getByRole('button', { name: 'Verifying...' });
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
    });

    it('is not busy and says "Continue" when not loading', () => {
      setup({ isLoading: false });
      expect(continueButton()).toHaveAttribute('aria-busy', 'false');
    });

    it('disables the password field, Cancel and the confirm button while loading', () => {
      setup({ isLoading: true });
      expect(passwordInput()).toBeDisabled();
      expect(cancelButton()).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Verifying...' })).toBeDisabled();
    });

    it('keeps the confirm button disabled while loading even if a password was typed', async () => {
      const user = userEvent.setup();
      const { rerender, props } = setup();

      await user.type(passwordInput(), 'hunter2');
      expect(continueButton()).toBeEnabled();

      rerender(<ReauthModal {...props} isLoading />);
      expect(screen.getByRole('button', { name: 'Verifying...' })).toBeDisabled();
    });

    it('does not call onSuccess or onClose when the disabled Cancel / confirm buttons are clicked', async () => {
      const user = userEvent.setup();
      const { onSuccess, onClose } = setup({ isLoading: true });

      await user.click(cancelButton());
      await user.click(screen.getByRole('button', { name: 'Verifying...' }));

      expect(onClose).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('ignores backdrop clicks while loading', () => {
      const { container, onClose } = setup({ isLoading: true });
      fireEvent.click(backdrop(container));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('re-enables the form once loading finishes', () => {
      const { rerender, props } = setup({ isLoading: true });
      rerender(<ReauthModal {...props} isLoading={false} />);

      expect(passwordInput()).toBeEnabled();
      expect(cancelButton()).toBeEnabled();
    });
  });

  describe('closing', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const { onClose, onSuccess } = setup();

      await user.click(cancelButton());

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('calls onClose when the ✕ button is clicked', async () => {
      const user = userEvent.setup();
      const { onClose } = setup();

      await user.click(closeButton());

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('hides the ✕ glyph from assistive technology and names the button via aria-label', () => {
      setup();
      expect(closeButton()).toHaveAccessibleName('Close dialog');
      expect(closeButton().querySelector('[aria-hidden="true"]')).toHaveTextContent('✕');
    });

    it('calls onClose when the backdrop is clicked', () => {
      const { container, onClose } = setup();
      fireEvent.click(backdrop(container));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when the dialog itself is clicked', async () => {
      const user = userEvent.setup();
      const { onClose } = setup();

      await user.click(screen.getByRole('dialog'));
      await user.click(screen.getByText('Please re-authenticate to continue'));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Escape key', () => {
    it('calls onClose and prevents the default action', () => {
      const { onClose } = setup();

      const event = pressKey('Escape');

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it('works from inside the password field', async () => {
      const user = userEvent.setup();
      const { onClose } = setup();

      await user.type(passwordInput(), 'abc{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onSuccess', () => {
      const { onSuccess } = setup();
      pressKey('Escape');
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('does nothing while the modal is closed', () => {
      const { onClose } = setup({ isOpen: false });

      const event = pressKey('Escape');

      expect(onClose).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it('stops listening once the modal closes', () => {
      const { onClose, rerender, props } = setup();
      rerender(<ReauthModal {...props} isOpen={false} />);

      pressKey('Escape');

      expect(onClose).not.toHaveBeenCalled();
    });

    it('stops listening after unmount', () => {
      const { onClose, unmount } = setup();
      unmount();

      pressKey('Escape');

      expect(onClose).not.toHaveBeenCalled();
    });

    it('always calls the latest onClose after a re-render', () => {
      const first = vi.fn();
      const second = vi.fn();
      const { rerender, props } = setup({ onClose: first });

      rerender(<ReauthModal {...props} onClose={second} />);
      pressKey('Escape');

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('ignores other keys', () => {
      const { onClose, onSuccess } = setup();

      for (const key of ['Enter', ' ', 'a', 'ArrowDown', 'Shift']) {
        pressKey(key);
      }

      expect(onClose).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('focus management', () => {
    it('moves focus to the password field when opened', async () => {
      setup();
      await waitFor(() => expect(passwordInput()).toHaveFocus());
    });

    it('moves focus to the password field when opened after initially being closed', async () => {
      const { rerender, props } = setup({ isOpen: false });
      rerender(<ReauthModal {...props} isOpen />);
      await waitFor(() => expect(passwordInput()).toHaveFocus());
    });

    it('falls back to focusing the dialog container if the password field cannot be found', async () => {
      const original = Element.prototype.querySelector;
      vi.spyOn(Element.prototype, 'querySelector').mockImplementation(function (
        this: Element,
        selector: string
      ) {
        return selector === '#reauth-password' ? null : original.call(this, selector);
      });

      setup();

      await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    });

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open reauth
          </button>
          <ReauthModal isOpen={open} onSuccess={() => setOpen(false)} onClose={() => setOpen(false)} />
        </>
      );
    }

    it('returns focus to the element that opened it when closed with Escape', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const trigger = screen.getByRole('button', { name: 'Open reauth' });

      await user.click(trigger);
      await waitFor(() => expect(passwordInput()).toHaveFocus());

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('returns focus to the opener when closed with Cancel', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const trigger = screen.getByRole('button', { name: 'Open reauth' });

      await user.click(trigger);
      await user.click(cancelButton());

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it('returns focus to the opener after a successful submit', async () => {
      const user = userEvent.setup();
      render(<Harness />);
      const trigger = screen.getByRole('button', { name: 'Open reauth' });

      await user.click(trigger);
      await user.type(passwordInput(), 'hunter2{Enter}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  describe('focus trap', () => {
    it('with an empty password the tab cycle is ✕ → password → Cancel (Continue is disabled)', async () => {
      const user = userEvent.setup();
      await setupSettled();

      await user.tab();
      expect(cancelButton()).toHaveFocus();
    });

    it('wraps Tab from the last control (Cancel) back to the first (✕) when Continue is disabled', async () => {
      const user = userEvent.setup();
      await setupSettled();
      cancelButton().focus();

      await user.tab();

      expect(closeButton()).toHaveFocus();
    });

    it('wraps Tab from Continue back to ✕ once a password has been entered', async () => {
      const user = userEvent.setup();
      await setupSettled();
      await user.type(passwordInput(), 'hunter2');
      continueButton().focus();

      await user.tab();

      expect(closeButton()).toHaveFocus();
    });

    it('wraps Shift+Tab from the first control (✕) to the last (Cancel)', async () => {
      const user = userEvent.setup();
      await setupSettled();
      closeButton().focus();

      await user.tab({ shift: true });

      expect(cancelButton()).toHaveFocus();
    });

    it('wraps Shift+Tab from ✕ to Continue when a password has been entered', async () => {
      const user = userEvent.setup();
      await setupSettled();
      await user.type(passwordInput(), 'hunter2');
      closeButton().focus();

      await user.tab({ shift: true });

      expect(continueButton()).toHaveFocus();
    });

    it('prevents the default Tab action only when it wraps', async () => {
      await setupSettled();

      closeButton().focus();
      const shiftTabOnFirst = pressKey('Tab', { shiftKey: true });
      expect(shiftTabOnFirst.defaultPrevented).toBe(true);

      cancelButton().focus();
      const tabOnLast = pressKey('Tab');
      expect(tabOnLast.defaultPrevented).toBe(true);

      passwordInput().focus();
      const tabInMiddle = pressKey('Tab');
      expect(tabInMiddle.defaultPrevented).toBe(false);

      passwordInput().focus();
      const shiftTabInMiddle = pressKey('Tab', { shiftKey: true });
      expect(shiftTabInMiddle.defaultPrevented).toBe(false);
    });

    it('does not move focus when Tab is pressed on a middle control', async () => {
      await setupSettled();
      passwordInput().focus();

      pressKey('Tab');

      expect(passwordInput()).toHaveFocus();
    });

    it('moves focus naturally between controls in the middle of the cycle', async () => {
      const user = userEvent.setup();
      await setupSettled();
      closeButton().focus();

      await user.tab();
      expect(passwordInput()).toHaveFocus();

      await user.tab({ shift: true });
      expect(closeButton()).toHaveFocus();
    });

    it('keeps focus inside the dialog across repeated Tab presses', async () => {
      const user = userEvent.setup();
      await setupSettled();
      const dialog = screen.getByRole('dialog');
      await waitFor(() => expect(passwordInput()).toHaveFocus());

      for (let i = 0; i < 8; i++) {
        await user.tab();
        expect(dialog).toContainElement(document.activeElement as HTMLElement);
      }
    });

    it('treats Continue as focusable only when it is enabled', async () => {
      const user = userEvent.setup();
      await setupSettled();
      cancelButton().focus();

      // Continue is disabled, so Cancel is last and Tab wraps to ✕.
      await user.tab();
      expect(closeButton()).toHaveFocus();
      expect(continueButton()).not.toHaveFocus();
    });
  });

  describe('accessibility attributes', () => {
    it('exposes a modal dialog named by its title and described by its description', () => {
      setup();
      const dialog = screen.getByRole('dialog', { name: 'Please re-authenticate to continue' });

      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'reauth-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'reauth-desc');
      expect(dialog).toHaveAccessibleDescription(/Your session has expired or requires re-authentication/);
    });

    it('points aria-labelledby / aria-describedby at elements that exist', () => {
      setup();
      expect(document.getElementById('reauth-title')).toHaveTextContent(
        'Please re-authenticate to continue'
      );
      expect(document.getElementById('reauth-desc')).toBeInTheDocument();
    });

    it('is programmatically focusable but not in the tab order', () => {
      setup();
      expect(screen.getByRole('dialog')).toHaveAttribute('tabindex', '-1');
    });

    it('associates the Password label with the input', () => {
      setup();
      expect(screen.getByText('Password')).toHaveAttribute('for', 'reauth-password');
      expect(passwordInput()).toHaveAccessibleName('Password');
    });

    it('announces errors with role="alert"', () => {
      setup({ error: 'Incorrect password.' });
      expect(screen.getByRole('alert')).toHaveTextContent('Incorrect password.');
    });

    it('associates the confirm button with the form even though it sits outside it', () => {
      setup();
      expect(continueButton()).toHaveAttribute('type', 'submit');
      expect(continueButton()).toHaveAttribute('form', 'reauth-form');
      expect(document.getElementById('reauth-form')).toBeInTheDocument();
    });

    it('gives Cancel and ✕ type="button" so they never submit the form', () => {
      setup();
      expect(cancelButton()).toHaveAttribute('type', 'button');
      expect(closeButton()).toHaveAttribute('type', 'button');
    });
  });
});
