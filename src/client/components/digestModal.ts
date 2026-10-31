import { el, setupFocusTrap } from '../utils/dom.ts';
import { storageService } from '../storage/localStorage.ts';
import { isItemInDateRange } from '../logic/filters.ts';
import { showToast, announceToScreenReader } from './toast.ts';

// In-memory session cache per unique set of items
const digestSessionCache = new Map<string, string>();

function computeItemsCacheKey(
  items: Array<{ id: string; title: string; date: string | null; time: string | null }>
): string {
  return items
    .map((i) => `${i.id}:${i.title}:${i.date || ''}:${i.time || ''}`)
    .sort()
    .join('|');
}

export async function openWeeklyDigestModal(triggerElement?: HTMLElement | null): Promise<void> {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const allItems = storageService.loadItems();
  const next7DaysItems = allItems.filter((i) => isItemInDateRange(i, 'week'));

  const minimalItems = next7DaysItems.map((item) => ({
    title: item.title,
    date: item.date,
    time: item.time,
    venue: item.venue,
    category: item.category,
    isDeadline: item.isDeadline,
    summary: item.summary
  }));

  const cacheKey = computeItemsCacheKey(next7DaysItems);

  // Modal setup
  let cleanupFocusTrap: (() => void) | null = null;
  function closeModal() {
    if (cleanupFocusTrap) cleanupFocusTrap();
    modalRoot!.textContent = '';
    modalRoot!.setAttribute('aria-hidden', 'true');
    triggerElement?.focus();
  }

  const closeBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-ghost',
      'aria-label': 'Close weekly digest'
    },
    '✕'
  );
  closeBtn.addEventListener('click', closeModal);

  const modalHeader = el(
    'div',
    { className: 'modal-header' },
    el('h2', { id: 'digest-modal-title', style: 'font-size: var(--font-lg); margin: 0;' }, 'Weekly Campus Briefing'),
    closeBtn
  );

  const contentArea = el('div', {
    id: 'digest-content',
    style:
      'background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; font-family: inherit; font-size: var(--font-base); line-height: 1.6; white-space: pre-wrap; word-break: break-word; min-height: 120px;'
  });

  const copyBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-secondary',
      disabled: true,
      'aria-label': 'Copy digest to clipboard'
    },
    '📋 Copy Digest'
  );

  const doneBtn = el('button', { type: 'button', className: 'btn btn-primary' }, 'Done');
  doneBtn.addEventListener('click', closeModal);

  const modalFooter = el('div', { className: 'modal-footer' }, copyBtn, doneBtn);

  const dialog = el(
    'div',
    {
      className: 'modal-dialog',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'digest-modal-title'
    },
    modalHeader,
    el('div', { className: 'modal-body' }, contentArea),
    modalFooter
  );

  const backdrop = el('div', { className: 'modal-backdrop' }, dialog);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  modalRoot.textContent = '';
  modalRoot.removeAttribute('aria-hidden');
  modalRoot.appendChild(backdrop);
  cleanupFocusTrap = setupFocusTrap(dialog, closeModal);

  // Check cache first
  const cached = digestSessionCache.get(cacheKey);
  if (cached) {
    displayDigestText(cached, 'Session Cache');
    return;
  }

  // If no items in next 7 days, provide friendly message immediately
  if (minimalItems.length === 0) {
    const emptyNotice =
      "You're completely clear for the coming 7 days! 🎉\n\nNo classes, exams, or deadlines were found on your schedule. Paste any upcoming circulars or WhatsApp notices anytime to keep your pulse up to date.";
    digestSessionCache.set(cacheKey, emptyNotice);
    displayDigestText(emptyNotice, 'System');
    return;
  }

  // Fetch from server
  contentArea.textContent = 'Generating intelligent weekly briefing... ✨';
  announceToScreenReader('Generating your weekly digest. Please wait...');

  try {
    const response = await fetch('/api/digest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: minimalItems })
    });

    if (!response.ok) {
      throw new Error('Failed to generate digest from server');
    }

    const data: { digest: string; source: 'ai' | 'offline' } = await response.json();
    const digestText = data.digest.trim();

    digestSessionCache.set(cacheKey, digestText);
    displayDigestText(digestText, data.source === 'ai' ? 'Gemini 2.5 Flash' : 'Offline Template');
  } catch (err) {
    console.error('Digest error:', err);
    contentArea.textContent =
      'Could not generate weekly briefing at this moment. Please check your network connection and try again.';
    announceToScreenReader('Failed to generate weekly digest.');
  }

  function displayDigestText(digest: string, sourceLabel: string) {
    contentArea.textContent = `${digest}\n\n[Source: ${sourceLabel}]`;
    copyBtn.disabled = false;
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(digest);
        copyBtn.textContent = '✓ Copied!';
        announceToScreenReader('Weekly digest copied to clipboard.');
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy Digest';
        }, 2500);
      } catch {
        showToast('Clipboard access was not permitted.');
      }
    });
    announceToScreenReader('Weekly digest is ready.');
  }
}

