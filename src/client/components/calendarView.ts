import { el } from '../utils/dom.ts';
import { CampusItem } from '../../shared/types.ts';
import { detectClashes } from '../logic/clashes.ts';
import { formatDateISO } from '../logic/status.ts';
import { openPreviewModal } from './previewModal.ts';
import { showToast, announceToScreenReader } from './toast.ts';
import { storageService } from '../storage/localStorage.ts';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export interface CalendarViewCallbacks {
  onEventModified: () => void;
}

export function renderCalendarView(
  items: CampusItem[],
  callbacks: CalendarViewCallbacks
): HTMLElement {
  const container = el('div', { className: 'calendar-view', 'aria-label': 'Monthly Campus Calendar' });

  // State for current displayed month
  let displayDate = new Date();

  function buildCalendar() {
    container.textContent = '';

    const currentYear = displayDate.getFullYear();
    const currentMonth = displayDate.getMonth();

    const todayStr = formatDateISO(new Date());

    // Navigation Header
    const prevBtn = el(
      'button',
      {
        type: 'button',
        className: 'btn btn-secondary',
        'aria-label': `Previous month, ${MONTH_NAMES[(currentMonth + 11) % 12]}`
      },
      '← Prev'
    );
    prevBtn.addEventListener('click', () => {
      displayDate = new Date(currentYear, currentMonth - 1, 1);
      buildCalendar();
      announceToScreenReader(`Viewing ${MONTH_NAMES[displayDate.getMonth()]} ${displayDate.getFullYear()}`);
    });

    const nextBtn = el(
      'button',
      {
        type: 'button',
        className: 'btn btn-secondary',
        'aria-label': `Next month, ${MONTH_NAMES[(currentMonth + 1) % 12]}`
      },
      'Next →'
    );
    nextBtn.addEventListener('click', () => {
      displayDate = new Date(currentYear, currentMonth + 1, 1);
      buildCalendar();
      announceToScreenReader(`Viewing ${MONTH_NAMES[displayDate.getMonth()]} ${displayDate.getFullYear()}`);
    });

    const todayBtn = el(
      'button',
      {
        type: 'button',
        className: 'btn btn-ghost',
        'aria-label': 'Go to current month'
      },
      'Today'
    );
    todayBtn.addEventListener('click', () => {
      displayDate = new Date();
      buildCalendar();
      announceToScreenReader(`Jumped to today`);
    });

    const monthTitle = el(
      'h3',
      { style: 'margin: 0; font-size: var(--font-lg);', 'aria-live': 'polite' },
      `${MONTH_NAMES[currentMonth]} ${currentYear}`
    );

    const navControls = el(
      'div',
      { style: 'display: flex; gap: 0.5rem; align-items: center;' },
      todayBtn,
      prevBtn,
      nextBtn
    );

    const header = el(
      'div',
      { className: 'calendar-header' },
      monthTitle,
      navControls
    );

    // Day headers row
    const grid = el('div', { className: 'calendar-grid', role: 'grid', 'aria-label': `${MONTH_NAMES[currentMonth]} ${currentYear} Grid` });

    for (let i = 0; i < 7; i++) {
      const dayHeader = el(
        'div',
        {
          className: 'calendar-day-header',
          role: 'columnheader',
          'aria-label': FULL_DAY_NAMES[i]
        },
        DAY_NAMES[i]
      );
      grid.appendChild(dayHeader);
    }

    // Days calculation
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    // Group items by date YYYY-MM-DD
    const itemsByDate = new Map<string, CampusItem[]>();
    for (const item of items) {
      if (item.date) {
        const existing = itemsByDate.get(item.date) || [];
        existing.push(item);
        itemsByDate.set(item.date, existing);
      }
    }

    const clashMap = detectClashes(items);

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const cell = el(
        'div',
        {
          className: 'calendar-cell other-month',
          role: 'gridcell',
          'aria-label': `Previous month day ${dayNum}`
        },
        el('span', { className: 'calendar-cell-date' }, String(dayNum))
      );
      grid.appendChild(cell);
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayItems = itemsByDate.get(dateStr) || [];
      const isToday = dateStr === todayStr;

      const cell = el(
        'div',
        {
          className: `calendar-cell ${isToday ? 'today' : ''}`,
          role: 'gridcell',
          tabIndex: 0,
          'aria-label': `${MONTH_NAMES[currentMonth]} ${day}, ${currentYear}, ${dayItems.length} events scheduled`
        },
        el(
          'span',
          { className: 'calendar-cell-date' },
          String(day),
          isToday ? el('small', { style: 'color: var(--brand-primary); margin-left: 0.25rem;' }, '(Today)') : null
        )
      );

      for (const item of dayItems) {
        const hasClash = clashMap.get(item.id)?.hasClash;
        const timePart = item.time ? `${item.time} ` : '';

        const eventPill = el(
          'button',
          {
            type: 'button',
            className: 'calendar-event-pill',
            style: hasClash ? 'background-color: var(--urgent-border);' : '',
            'aria-label': `${item.title} at ${item.time || 'all day'}${hasClash ? ' (Warning: Event Clashes)' : ''}`,
            title: `${item.title} (${item.time || 'All day'})`
          },
          hasClash ? '⚠️ ' : '',
          timePart,
          item.title
        );

        eventPill.addEventListener('click', (e) => {
          e.stopPropagation();
          openPreviewModal({
            item,
            source: item.source,
            triggerElement: eventPill,
            onSave: (updated) => {
              storageService.updateItem(updated);
              callbacks.onEventModified();
              showToast(`Updated "${updated.title}"`);
            }
          });
        });

        cell.appendChild(eventPill);
      }

      grid.appendChild(cell);
    }

    // 3. Next month trailing days to complete 7-column grid
    const totalCells = firstDayIndex + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const cell = el(
        'div',
        {
          className: 'calendar-cell other-month',
          role: 'gridcell',
          'aria-label': `Next month day ${day}`
        },
        el('span', { className: 'calendar-cell-date' }, String(day))
      );
      grid.appendChild(cell);
    }

    container.appendChild(header);
    container.appendChild(grid);
  }

  buildCalendar();
  return container;
}
