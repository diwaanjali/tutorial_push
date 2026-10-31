import { el, createSvg } from '../utils/dom.ts';
import { FilterState } from '../../shared/types.ts';
import { CATEGORIES } from '../../shared/constants.ts';
import { calculateItemStatus } from '../logic/status.ts';
import { detectClashes } from '../logic/clashes.ts';
import { filterAndSortCampusItems } from '../logic/filters.ts';
import { storageService } from '../storage/localStorage.ts';
import { openPreviewModal } from './previewModal.ts';
import { showToast, announceToScreenReader } from './toast.ts';
import { renderCalendarView } from './calendarView.ts';

export interface ItemsViewCallbacks {
  onItemsChanged: () => void;
  currentView: 'list' | 'calendar';
  onViewToggled: (newView: 'list' | 'calendar') => void;
}

export function initItemsView(callbacks: ItemsViewCallbacks): void {
  const container = document.getElementById('items-section');
  if (!container) return;
  container.textContent = '';

  const filterState: FilterState = {
    searchQuery: '',
    category: 'all',
    dateRange: 'all',
    status: 'all',
    onlyRelevant: storageService.loadUserProfile().filterOnlyRelevant
  };

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Header & Controls
  const sectionTitle = el('h2', { id: 'items-heading', style: 'margin: 0;' }, 'My Campus Items');

  // Search input
  const searchInput = el('input', {
    type: 'search',
    className: 'search-input',
    placeholder: 'Search by title, venue, or keywords...',
    'aria-label': 'Search campus items'
  }) as HTMLInputElement;

  const searchIcon = createSvg('0 0 24 24', 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z', { className: 'search-icon' });

  const searchWrapper = el('div', { className: 'search-input-wrapper' }, searchIcon, searchInput);

  searchInput.addEventListener('input', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      filterState.searchQuery = searchInput.value;
      renderItems();
      announceToScreenReader(`Filtered items for query: ${searchInput.value}`);
    }, 200);
  });

  // Category chips
  const chipsRow = el('div', { className: 'chips-row', role: 'radiogroup', 'aria-label': 'Filter by category' });

  const allChip = el(
    'button',
    {
      type: 'button',
      className: 'filter-chip active',
      role: 'radio',
      'aria-checked': 'true'
    },
    'All Categories'
  );
  allChip.addEventListener('click', () => {
    chipsRow.querySelectorAll('.filter-chip').forEach((c) => {
      c.classList.remove('active');
      c.setAttribute('aria-checked', 'false');
    });
    allChip.classList.add('active');
    allChip.setAttribute('aria-checked', 'true');
    filterState.category = 'all';
    renderItems();
  });
  chipsRow.appendChild(allChip);

  for (const cat of CATEGORIES) {
    const chip = el(
      'button',
      {
        type: 'button',
        className: 'filter-chip',
        role: 'radio',
        'aria-checked': 'false'
      },
      cat
    );
    chip.addEventListener('click', () => {
      chipsRow.querySelectorAll('.filter-chip').forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-checked', 'true');
      filterState.category = cat;
      renderItems();
    });
    chipsRow.appendChild(chip);
  }

  // Date Range and Status selects
  const dateRangeSelect = el('select', {
    className: 'form-select',
    'aria-label': 'Filter by date range'
  }) as HTMLSelectElement;
  dateRangeSelect.appendChild(el('option', { value: 'all' }, 'All Dates'));
  dateRangeSelect.appendChild(el('option', { value: 'today' }, 'Due Today'));
  dateRangeSelect.appendChild(el('option', { value: 'week' }, 'Next 7 Days'));
  dateRangeSelect.addEventListener('change', () => {
    filterState.dateRange = dateRangeSelect.value as FilterState['dateRange'];
    renderItems();
  });

  const statusSelect = el('select', {
    className: 'form-select',
    'aria-label': 'Filter by status'
  }) as HTMLSelectElement;
  statusSelect.appendChild(el('option', { value: 'all' }, 'All Statuses'));
  statusSelect.appendChild(el('option', { value: 'urgent' }, '🚨 Urgent (<48h)'));
  statusSelect.appendChild(el('option', { value: 'upcoming' }, '🌱 Upcoming'));
  statusSelect.appendChild(el('option', { value: 'expired' }, '⌛ Expired'));
  statusSelect.addEventListener('change', () => {
    filterState.status = statusSelect.value as FilterState['status'];
    renderItems();
  });

  // View toggle: List vs Calendar
  const viewToggleBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-secondary',
      'aria-label': `Switch to ${callbacks.currentView === 'list' ? 'Calendar' : 'List'} view`
    },
    callbacks.currentView === 'list' ? '📅 Calendar View' : '📋 List View'
  );
  viewToggleBtn.addEventListener('click', () => {
    const nextView = callbacks.currentView === 'list' ? 'calendar' : 'list';
    callbacks.onViewToggled(nextView);
    viewToggleBtn.textContent = nextView === 'list' ? '📅 Calendar View' : '📋 List View';
    viewToggleBtn.setAttribute('aria-label', `Switch to ${nextView === 'list' ? 'Calendar' : 'List'} view`);
  });

  const viewAndDateRow = el(
    'div',
    { className: 'view-and-date-filters' },
    el('div', { style: 'display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;' }, dateRangeSelect, statusSelect),
    viewToggleBtn
  );

  const filtersBar = el(
    'div',
    { className: 'filters-bar' },
    searchWrapper,
    chipsRow,
    viewAndDateRow
  );

  const listContainer = el('div', { id: 'items-cards-container', className: 'items-grid' });

  function renderItems() {
    listContainer.textContent = '';
    const allItems = storageService.loadItems();
    const profile = storageService.loadUserProfile();
    filterState.onlyRelevant = profile.filterOnlyRelevant;

    const visibleItems = filterAndSortCampusItems(allItems, filterState, profile);
    const clashMap = detectClashes(allItems);

    if (callbacks.currentView === 'calendar') {
      const calendar = renderCalendarView(visibleItems, {
        onEventModified: () => {
          callbacks.onItemsChanged();
        }
      });
      listContainer.appendChild(calendar);
      return;
    }

    if (visibleItems.length === 0) {
      const emptyState = el(
        'div',
        {
          style:
            'grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);'
        },
        el('h3', { style: 'margin-bottom: 0.5rem;' }, 'No campus items found'),
        el('p', { style: 'margin-bottom: 1rem;' }, allItems.length === 0 ? 'Paste a notice above or click "Try Sample Notice" to get started!' : 'Try clearing your search query or filters to see more events.'),
        allItems.length === 0
          ? (() => {
              const btn = el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-primary'
                },
                '💡 Try a Sample Notice'
              );
              btn.addEventListener('click', () => {
                const sampleBtn = document.querySelector<HTMLButtonElement>('#add-section button.btn-secondary');
                sampleBtn?.click();
              });
              return btn;
            })()
          : null
      );
      listContainer.appendChild(emptyState);
      return;
    }

    for (const item of visibleItems) {
      const status = calculateItemStatus(item);
      const clash = clashMap.get(item.id);

      // Status Badge (Color + Icon + Text)
      let statusIcon = '🌱';
      let statusLabel = 'Upcoming';
      if (status === 'urgent') {
        statusIcon = '🚨';
        statusLabel = item.isDeadline ? 'Deadline Due' : 'Urgent';
      } else if (status === 'expired') {
        statusIcon = '⌛';
        statusLabel = 'Expired';
      }

      const statusBadge = el(
        'span',
        { className: `status-badge ${status}` },
        `${statusIcon} ${statusLabel}`
      );

      // Clash warning badge
      let clashBadge: HTMLElement | null = null;
      if (clash && clash.hasClash) {
        clashBadge = el(
          'span',
          { className: 'clash-badge' },
          `⚠️ Clashes with ${clash.conflictingTitles.slice(0, 1).join(', ')}`
        );
      }

      // Meta information
      const dateText = item.date || 'Date not mentioned';
      const timeText = item.time ? (item.endTime ? `${item.time} - ${item.endTime}` : item.time) : '';
      const dateTimeDisplay = timeText ? `${dateText} • ${timeText}` : dateText;

      const dateMeta = el(
        'div',
        { className: 'meta-item' },
        createSvg('0 0 24 24', 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z'),
        el('span', {}, dateTimeDisplay)
      );

      let venueMeta: HTMLElement | null = null;
      if (item.venue) {
        venueMeta = el(
          'div',
          { className: 'meta-item' },
          createSvg('0 0 24 24', 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'),
          el('span', {}, item.venue)
        );
      }

      // Category and audience badges
      const categoryBadge = el('span', { className: 'category-badge' }, item.category);

      let audienceBadge: HTMLElement | null = null;
      if (item.audience.department || item.audience.year) {
        const audParts = [];
        if (item.audience.department) audParts.push(item.audience.department.replace('Engineering', 'Eng'));
        if (item.audience.year) audParts.push(`Yr ${item.audience.year}`);
        audienceBadge = el('span', { className: 'audience-badge' }, audParts.join(' • '));
      }

      // Edit and Delete buttons
      const editBtn = el(
        'button',
        {
          type: 'button',
          className: 'btn btn-secondary',
          style: 'min-height: 36px; padding: 0.25rem 0.65rem; font-size: 0.85rem;',
          'aria-label': `Edit event: ${item.title}`
        },
        '✏️ Edit'
      );

      editBtn.addEventListener('click', () => {
        openPreviewModal({
          item,
          source: item.source,
          triggerElement: editBtn,
          onSave: (updated) => {
            storageService.updateItem(updated);
            callbacks.onItemsChanged();
            showToast(`Updated "${updated.title}"`);
          }
        });
      });

      const deleteBtn = el(
        'button',
        {
          type: 'button',
          className: 'btn btn-ghost',
          style: 'min-height: 36px; padding: 0.25rem 0.65rem; font-size: 0.85rem; color: var(--urgent-border);',
          'aria-label': `Delete event: ${item.title}`
        },
        '🗑️ Delete'
      );

      deleteBtn.addEventListener('click', () => {
        const deleted = storageService.deleteItem(item.id);
        callbacks.onItemsChanged();
        if (deleted) {
          showToast(`Deleted "${deleted.title}"`, {
            actionLabel: 'Undo',
            onAction: () => {
              storageService.restoreLastDeletedItem();
              callbacks.onItemsChanged();
              showToast(`Restored "${deleted.title}"`);
            }
          });
        }
      });

      const cardActions = el('div', { className: 'event-card-actions' }, editBtn, deleteBtn);

      const card = el(
        'article',
        {
          className: 'event-card',
          'aria-labelledby': `card-title-${item.id}`
        },
        el(
          'div',
          { className: 'event-card-header' },
          el('h3', { id: `card-title-${item.id}`, className: 'event-title' }, item.title),
          statusBadge
        ),
        el('div', { className: 'event-meta' }, dateMeta, venueMeta),
        el('p', { className: 'event-summary' }, item.summary),
        el('div', { className: 'event-badges' }, categoryBadge, audienceBadge, clashBadge),
        cardActions
      );

      listContainer.appendChild(card);
    }
  }

  // Initial render
  renderItems();

  container.appendChild(el('div', { style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;' }, sectionTitle));
  container.appendChild(filtersBar);
  container.appendChild(listContainer);
}
