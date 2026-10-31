import { el, setupFocusTrap } from '../utils/dom.ts';
import { CampusItem, Category } from '../../shared/types.ts';
import { CATEGORIES, DEPARTMENTS } from '../../shared/constants.ts';
import { checkNewItemClashes } from '../logic/clashes.ts';
import { storageService } from '../storage/localStorage.ts';
import { showToast, announceToScreenReader } from './toast.ts';

export interface PreviewModalOptions {
  item: Partial<CampusItem>;
  source: 'ai' | 'offline' | 'manual';
  onSave: (confirmedItem: CampusItem) => void;
  triggerElement?: HTMLElement | null;
}

export function openPreviewModal(options: PreviewModalOptions): void {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const item = options.item;
  const isEdit = Boolean(item.id);

  // Form fields
  const titleInput = el('input', {
    type: 'text',
    id: 'preview-title',
    className: 'form-input',
    value: item.title || '',
    required: true,
    maxLength: 120,
    placeholder: 'e.g. Google Placement Talk'
  }) as HTMLInputElement;

  const dateInput = el('input', {
    type: 'date',
    id: 'preview-date',
    className: 'form-input',
    value: item.date || ''
  }) as HTMLInputElement;

  const timeInput = el('input', {
    type: 'time',
    id: 'preview-time',
    className: 'form-input',
    value: item.time || ''
  }) as HTMLInputElement;

  const endTimeInput = el('input', {
    type: 'time',
    id: 'preview-end-time',
    className: 'form-input',
    value: item.endTime || ''
  }) as HTMLInputElement;

  const venueInput = el('input', {
    type: 'text',
    id: 'preview-venue',
    className: 'form-input',
    value: item.venue || '',
    maxLength: 120,
    placeholder: 'Not mentioned'
  }) as HTMLInputElement;

  const categorySelect = el('select', {
    id: 'preview-category',
    className: 'form-select'
  }) as HTMLSelectElement;

  for (const cat of CATEGORIES) {
    const opt = el('option', { value: cat }, cat) as HTMLOptionElement;
    if (item.category === cat) {
      opt.selected = true;
    }
    categorySelect.appendChild(opt);
  }

  const deadlineCheckbox = el('input', {
    type: 'checkbox',
    id: 'preview-deadline',
    checked: Boolean(item.isDeadline)
  }) as HTMLInputElement;

  const summaryInput = el('textarea', {
    id: 'preview-summary',
    className: 'form-input',
    rows: 2,
    maxLength: 200,
    placeholder: 'Brief summary'
  }) as HTMLTextAreaElement;
  summaryInput.value = item.summary || '';

  // Audience
  const deptSelect = el('select', {
    id: 'preview-dept',
    className: 'form-select'
  }) as HTMLSelectElement;

  const allDeptsOpt = el('option', { value: '' }, 'All Departments (Open to everyone)');
  deptSelect.appendChild(allDeptsOpt);
  for (const dept of DEPARTMENTS) {
    const opt = el('option', { value: dept }, dept) as HTMLOptionElement;
    if (item.audience?.department === dept) {
      opt.selected = true;
    }
    deptSelect.appendChild(opt);
  }

  const yearSelect = el('select', {
    id: 'preview-year',
    className: 'form-select'
  }) as HTMLSelectElement;

  const allYearsOpt = el('option', { value: '' }, 'All Years (1-4)');
  yearSelect.appendChild(allYearsOpt);
  for (const yr of [1, 2, 3, 4]) {
    const opt = el('option', { value: String(yr) }, `Year ${yr}`) as HTMLOptionElement;
    if (item.audience?.year === yr) {
      opt.selected = true;
    }
    yearSelect.appendChild(opt);
  }

  // Clash warning banner placeholder
  const clashNoticeContainer = el('div', {
    id: 'modal-clash-notice',
    style: 'display: none;',
    role: 'alert'
  });

  function updateClashWarning() {
    const tempItem: CampusItem = {
      id: item.id || 'temp-check',
      title: titleInput.value.trim() || 'Untitled',
      date: dateInput.value || null,
      time: timeInput.value || null,
      endTime: endTimeInput.value || null,
      venue: venueInput.value.trim() || null,
      category: categorySelect.value as Category,
      isDeadline: deadlineCheckbox.checked,
      summary: summaryInput.value.trim(),
      audience: {
        department: deptSelect.value || null,
        year: yearSelect.value ? parseInt(yearSelect.value, 10) : null
      },
      language: item.language || 'en',
      source: options.source,
      createdAt: item.createdAt || new Date().toISOString()
    };

    const conflicts = checkNewItemClashes(tempItem, storageService.loadItems());
    if (conflicts.length > 0) {
      clashNoticeContainer.style.display = 'block';
      clashNoticeContainer.textContent = '';
      const badge = el(
        'div',
        { className: 'clash-badge', style: 'padding: 0.5rem; width: 100%;' },
        `⚠️ Time Clash Warning: This overlaps with "${conflicts.map((c) => c.title).join(', ')}"`
      );
      clashNoticeContainer.appendChild(badge);
    } else {
      clashNoticeContainer.style.display = 'none';
      clashNoticeContainer.textContent = '';
    }
  }

  dateInput.addEventListener('change', updateClashWarning);
  timeInput.addEventListener('change', updateClashWarning);
  endTimeInput.addEventListener('change', updateClashWarning);
  updateClashWarning();

  // Source notice badge
  const sourceNotice = el(
    'div',
    {
      style:
        options.source === 'offline'
          ? 'padding: 0.4rem 0.75rem; background: var(--clash-bg); color: var(--clash-text); border-radius: var(--radius-sm); font-size: var(--font-xs); font-weight: 600;'
          : 'padding: 0.4rem 0.75rem; background: var(--brand-surface); color: var(--brand-primary); border-radius: var(--radius-sm); font-size: var(--font-xs); font-weight: 600;'
    },
    options.source === 'offline'
      ? '⚡ Used offline parser (Rule-based & Chrono-node)'
      : '✨ Extracted with Google Gemini 2.5 Flash'
  );

  // Form markup
  const form = el(
    'form',
    { className: 'modal-body' },
    sourceNotice,
    clashNoticeContainer,

    el(
      'div',
      { className: 'form-group' },
      el('label', { htmlFor: 'preview-title', className: 'form-label' }, 'Title *'),
      titleInput
    ),

    el(
      'div',
      { className: 'form-row' },
      el(
        'div',
        { className: 'form-group' },
        el('label', { htmlFor: 'preview-date', className: 'form-label' }, 'Date (YYYY-MM-DD)'),
        dateInput
      ),
      el(
        'div',
        { className: 'form-group' },
        el('label', { htmlFor: 'preview-category', className: 'form-label' }, 'Category *'),
        categorySelect
      )
    ),

    el(
      'div',
      { className: 'form-row' },
      el(
        'div',
        { className: 'form-group' },
        el('label', { htmlFor: 'preview-time', className: 'form-label' }, 'Start Time (HH:mm)'),
        timeInput
      ),
      el(
        'div',
        { className: 'form-group' },
        el('label', { htmlFor: 'preview-end-time', className: 'form-label' }, 'End Time (HH:mm)'),
        endTimeInput
      )
    ),

    el(
      'div',
      { className: 'form-group' },
      el('label', { htmlFor: 'preview-venue', className: 'form-label' }, 'Venue'),
      venueInput
    ),

    el(
      'div',
      { className: 'form-row' },
      el(
        'div',
        { className: 'form-group' },
        el('label', { htmlFor: 'preview-dept', className: 'form-label' }, 'Target Department'),
        deptSelect
      ),
      el(
        'div',
        { className: 'form-group' },
        el('label', { htmlFor: 'preview-year', className: 'form-label' }, 'Target Year'),
        yearSelect
      )
    ),

    el(
      'div',
      { className: 'form-group' },
      el('label', { htmlFor: 'preview-summary', className: 'form-label' }, 'Summary'),
      summaryInput
    ),

    el(
      'div',
      { style: 'display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem;' },
      deadlineCheckbox,
      el('label', { htmlFor: 'preview-deadline', className: 'form-label', style: 'margin: 0; cursor: pointer;' }, 'Mark as deadline / submission')
    )
  );

  // Close helper
  let cleanupFocusTrap: (() => void) | null = null;
  function closeModal() {
    if (cleanupFocusTrap) cleanupFocusTrap();
    modalRoot!.textContent = '';
    modalRoot!.setAttribute('aria-hidden', 'true');
    options.triggerElement?.focus();
  }

  // Header & Footer
  const closeBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-ghost',
      'aria-label': 'Close dialog'
    },
    '✕'
  );
  closeBtn.addEventListener('click', closeModal);

  const modalHeader = el(
    'div',
    { className: 'modal-header' },
    el('h2', { id: 'modal-title', style: 'font-size: var(--font-lg); margin: 0;' }, isEdit ? 'Edit Campus Item' : 'Review & Confirm Extraction'),
    closeBtn
  );

  const cancelBtn = el('button', { type: 'button', className: 'btn btn-secondary' }, 'Cancel');
  cancelBtn.addEventListener('click', closeModal);

  const saveBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, isEdit ? 'Save Changes' : 'Confirm & Save');

  const modalFooter = el('div', { className: 'modal-footer' }, cancelBtn, saveBtn);

  // Form submit handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleVal = titleInput.value.trim();
    if (!titleVal) {
      showToast('Title is required');
      titleInput.focus();
      return;
    }

    const confirmedItem: CampusItem = {
      id: item.id || crypto.randomUUID(),
      title: titleVal.slice(0, 120),
      date: dateInput.value || null,
      time: timeInput.value || null,
      endTime: endTimeInput.value || null,
      venue: venueInput.value.trim() ? venueInput.value.trim().slice(0, 120) : null,
      category: categorySelect.value as Category,
      isDeadline: deadlineCheckbox.checked,
      summary: summaryInput.value.trim().slice(0, 200) || titleVal,
      audience: {
        department: deptSelect.value || null,
        year: yearSelect.value ? parseInt(yearSelect.value, 10) : null
      },
      language: item.language || 'English',
      source: options.source,
      createdAt: item.createdAt || new Date().toISOString()
    };

    closeModal();
    options.onSave(confirmedItem);
  });

  const dialog = el(
    'div',
    {
      className: 'modal-dialog',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'modal-title'
    },
    modalHeader,
    form,
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
  announceToScreenReader(isEdit ? 'Edit item dialog opened' : 'Review extracted item dialog opened');
}

