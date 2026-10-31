import { el, createSvg } from '../utils/dom.ts';
import { calculateItemStatus, isTodayItem } from '../logic/status.ts';
import { sortCampusItems } from '../logic/filters.ts';
import { storageService } from '../storage/localStorage.ts';
import { notificationManager } from '../logic/notifications.ts';
import { openPreviewModal } from './previewModal.ts';
import { showToast } from './toast.ts';

export function initAttentionBanner(): void {
  const container = document.getElementById('attention-section');
  if (!container) return;

  function render() {
    container!.textContent = '';
    const allItems = storageService.loadItems();

    // Filter today or urgent items
    const attentionItems = allItems.filter((item) => {
      const status = calculateItemStatus(item);
      return status === 'urgent' || isTodayItem(item);
    });

    const sortedAttention = sortCampusItems(attentionItems);
    const hasUrgent = sortedAttention.length > 0;

    // Trigger notification check if supported
    notificationManager.checkAndNotifyUrgentItems(allItems);

    // Notification opt-in button
    const perm = notificationManager.getPermissionState();
    let notifyBtn: HTMLElement | null = null;
    if (perm === 'default') {
      notifyBtn = el(
        'button',
        {
          type: 'button',
          className: 'btn btn-secondary',
          style: 'min-height: 36px; padding: 0.2rem 0.6rem; font-size: 0.8rem;',
          'aria-label': 'Enable browser notification reminders'
        },
        '🔔 Enable Reminders'
      );
      notifyBtn.addEventListener('click', async () => {
        await notificationManager.requestPermission();
        render();
      });
    }

    const header = el(
      'div',
      { className: 'attention-header' },
      el(
        'div',
        { className: 'attention-title' },
        createSvg(
          '0 0 24 24',
          hasUrgent
            ? 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'
            : 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
          { fill: hasUrgent ? 'var(--urgent-text)' : 'var(--brand-primary)', width: '22', height: '22' }
        ),
        el('span', {}, hasUrgent ? 'Needs Attention Today & Next 48 Hours' : "Today's Status")
      ),
      notifyBtn
    );

    if (!hasUrgent) {
      const clearNotice = el(
        'div',
        { style: 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;' },
        el('p', { style: 'margin: 0; color: var(--text-primary); font-weight: 500;' }, "Nothing urgent. You're clear! Enjoy your downtime. 🎉"),
        el('span', { className: 'status-badge upcoming' }, '✓ All Clear')
      );

      const banner = el(
        'div',
        { className: 'attention-banner' },
        header,
        clearNotice
      );
      container!.appendChild(banner);
      return;
    }

    const list = el('ul', { className: 'attention-list' });

    for (const item of sortedAttention.slice(0, 5)) {
      const isToday = isTodayItem(item);
      const badgeIcon = item.isDeadline ? '🚨' : isToday ? '⏰' : '⚠️';
      const badgeText = item.isDeadline ? 'Deadline' : isToday ? 'Today' : 'Urgent';

      const timeText = item.time ? `At ${item.time}` : 'Today';
      const venueText = item.venue ? ` • ${item.venue}` : '';

      const badge = el('span', { className: 'status-badge urgent' }, `${badgeIcon} ${badgeText}`);

      const itemRow = el(
        'li',
        {
          className: 'attention-item',
          tabIndex: 0,
          role: 'button',
          'aria-label': `${item.title}, ${badgeText}, ${timeText}${venueText}. Click to view or edit.`
        },
        el(
          'div',
          { style: 'display: flex; flex-direction: column; gap: 0.15rem; min-width: 0;' },
          el('strong', { style: 'font-size: var(--font-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' }, item.title),
          el('span', { style: 'font-size: var(--font-xs); color: var(--text-secondary);' }, `${timeText}${venueText}`)
        ),
        badge
      );

      itemRow.addEventListener('click', () => {
        openPreviewModal({
          item,
          source: item.source,
          triggerElement: itemRow,
          onSave: (updated) => {
            storageService.updateItem(updated);
            render();
            showToast(`Updated "${updated.title}"`);
          }
        });
      });

      itemRow.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          itemRow.click();
        }
      });

      list.appendChild(itemRow);
    }

    const banner = el(
      'div',
      { className: 'attention-banner has-urgent' },
      header,
      list
    );
    container!.appendChild(banner);
  }

  // Initial render
  render();

  // Listen for items updated event
  window.addEventListener('campuspulse:items-updated', () => {
    render();
  });
}
