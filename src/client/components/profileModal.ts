import { el, setupFocusTrap } from '../utils/dom.ts';
import { storageService } from '../storage/localStorage.ts';
import { DEPARTMENTS, YEARS } from '../../shared/constants.ts';
import { showToast, announceToScreenReader } from './toast.ts';

export interface ProfileModalCallbacks {
  onProfileUpdated: () => void;
  triggerElement?: HTMLElement | null;
}

export function openProfileModal(callbacks: ProfileModalCallbacks): void {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const currentProfile = storageService.loadUserProfile();

  // 1. Department dropdown
  const deptSelect = el('select', {
    id: 'profile-dept-select',
    className: 'form-select'
  }) as HTMLSelectElement;

  deptSelect.appendChild(el('option', { value: '' }, 'All Departments (No preference)'));
  for (const dept of DEPARTMENTS) {
    const opt = el('option', { value: dept }, dept) as HTMLOptionElement;
    if (currentProfile.department === dept) {
      opt.selected = true;
    }
    deptSelect.appendChild(opt);
  }

  // 2. Year dropdown
  const yearSelect = el('select', {
    id: 'profile-year-select',
    className: 'form-select'
  }) as HTMLSelectElement;

  yearSelect.appendChild(el('option', { value: '' }, 'All Years (1-4)'));
  for (const yr of YEARS) {
    const opt = el('option', { value: String(yr) }, `Year ${yr}`) as HTMLOptionElement;
    if (currentProfile.year === yr) {
      opt.selected = true;
    }
    yearSelect.appendChild(opt);
  }

  // 3. "Show only relevant to me" Toggle checkbox
  const toggleCheckbox = el('input', {
    type: 'checkbox',
    id: 'profile-relevant-toggle',
    checked: currentProfile.filterOnlyRelevant
  }) as HTMLInputElement;

  // Header & Close
  let cleanupFocusTrap: (() => void) | null = null;
  function closeModal() {
    if (cleanupFocusTrap) cleanupFocusTrap();
    modalRoot!.textContent = '';
    modalRoot!.setAttribute('aria-hidden', 'true');
    callbacks.triggerElement?.focus();
  }

  const closeBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-ghost',
      'aria-label': 'Close profile dialog'
    },
    '✕'
  );
  closeBtn.addEventListener('click', closeModal);

  const modalHeader = el(
    'div',
    { className: 'modal-header' },
    el('h2', { id: 'profile-modal-title', style: 'font-size: var(--font-lg); margin: 0;' }, 'Personalise Campus Pulse'),
    closeBtn
  );

  const form = el(
    'form',
    { className: 'modal-body' },
    el(
      'p',
      { style: 'font-size: var(--font-sm); color: var(--text-secondary); margin: 0;' },
      'Select your department and year. Campus Pulse will personalise your views, highlighting notices tailored for you while keeping campus-wide events visible.'
    ),
    el(
      'div',
      { className: 'form-group' },
      el('label', { htmlFor: 'profile-dept-select', className: 'form-label' }, 'My Department'),
      deptSelect
    ),
    el(
      'div',
      { className: 'form-group' },
      el('label', { htmlFor: 'profile-year-select', className: 'form-label' }, 'My Year of Study'),
      yearSelect
    ),
    el(
      'div',
      {
        style:
          'display: flex; align-items: center; gap: 0.75rem; background: var(--bg-primary); padding: 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);'
      },
      toggleCheckbox,
      el(
        'div',
        { style: 'display: flex; flex-direction: column;' },
        el('label', { htmlFor: 'profile-relevant-toggle', className: 'form-label', style: 'margin: 0; cursor: pointer;' }, 'Show only relevant to me'),
        el('small', { style: 'color: var(--text-muted);' }, 'Filter out notices strictly meant for other departments or years.')
      )
    )
  );

  const cancelBtn = el('button', { type: 'button', className: 'btn btn-secondary' }, 'Cancel');
  cancelBtn.addEventListener('click', closeModal);

  const saveBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Save Preferences');

  const modalFooter = el('div', { className: 'modal-footer' }, cancelBtn, saveBtn);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const updatedDept = deptSelect.value || null;
    const updatedYear = yearSelect.value ? parseInt(yearSelect.value, 10) : null;
    const onlyRelevant = toggleCheckbox.checked;

    storageService.saveUserProfile({
      department: updatedDept,
      year: updatedYear,
      filterOnlyRelevant: onlyRelevant
    });

    closeModal();
    callbacks.onProfileUpdated();
    showToast('Preferences updated! Your feed is now personalised.');
    announceToScreenReader('Preferences updated successfully.');
  });

  const dialog = el(
    'div',
    {
      className: 'modal-dialog',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'profile-modal-title'
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
  announceToScreenReader('Personalisation profile dialog opened');
}

