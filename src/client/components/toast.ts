import { el } from '../utils/dom.ts';

export function announceToScreenReader(message: string): void {
  const announcer = document.getElementById('a11y-announcer');
  if (announcer) {
    announcer.textContent = '';
    // Small timeout ensures screen readers catch the text node change
    setTimeout(() => {
      announcer.textContent = message;
    }, 50);
  }
}

export function showToast(
  message: string,
  options: {
    durationMs?: number;
    actionLabel?: string;
    onAction?: () => void;
  } = {}
): void {
  const container = document.getElementById('toast-root');
  if (!container) return;

  const duration = options.durationMs || 5000;

  // Build toast element with safe DOM
  const messageSpan = el('span', {}, message);

  let actionBtn: HTMLButtonElement | null = null;
  if (options.actionLabel && options.onAction) {
    actionBtn = el(
      'button',
      {
        type: 'button',
        className: 'btn btn-secondary',
        style: 'min-height: 36px; padding: 0.25rem 0.75rem; font-size: 0.85rem;'
      },
      options.actionLabel
    );

    actionBtn.addEventListener('click', () => {
      options.onAction?.();
      toastEl.remove();
    });
  }

  const dismissBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-ghost',
      'aria-label': 'Dismiss notification',
      style: 'min-height: 36px; min-width: 36px; padding: 0.2rem; margin-left: auto;'
    },
    '✕'
  );

  const toastEl = el(
    'div',
    {
      className: 'toast',
      role: 'status'
    },
    messageSpan,
    actionBtn,
    dismissBtn
  );

  dismissBtn.addEventListener('click', () => {
    toastEl.remove();
  });

  container.appendChild(toastEl);
  announceToScreenReader(message);

  setTimeout(() => {
    if (toastEl.parentElement) {
      toastEl.remove();
    }
  }, duration);
}
