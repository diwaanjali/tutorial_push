import { el, createSvg } from '../utils/dom.ts';
import { STORAGE_KEY_THEME, STORAGE_KEY_TEXT_SIZE } from '../../shared/constants.ts';
import { announceToScreenReader } from './toast.ts';

export interface HeaderCallbacks {
  onOpenDigest: () => void;
  onOpenProfile: () => void;
}

export function initHeader(callbacks: HeaderCallbacks): void {
  const container = document.getElementById('header-container');
  if (!container) return;
  container.textContent = ''; // clear

  // 1. Brand Section with single <h1>
  const pulseIcon = createSvg(
    '0 0 24 24',
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z',
    { fill: 'var(--brand-primary)', width: '28', height: '28' }
  );

  const titleH1 = el('h1', { style: 'font-size: var(--font-xl); margin: 0; line-height: 1;' }, 'Campus Pulse');
  const badge = el('span', { className: 'brand-badge' }, 'Student Life AI');

  const brand = el(
    'div',
    { className: 'brand-section' },
    pulseIcon,
    titleH1,
    badge
  );

  // 2. Theme Management (Light / Dark)
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);

  const themeBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-secondary',
      'aria-label': savedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      title: 'Toggle light/dark theme'
    },
    savedTheme === 'dark' ? '☀️ Light' : '🌙 Dark'
  );

  themeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY_THEME, next);
    themeBtn.textContent = next === 'dark' ? '☀️ Light' : '🌙 Dark';
    themeBtn.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    announceToScreenReader(`Switched to ${next} mode`);
  });

  // 3. Accessible Text Size Control
  const savedTextSize = localStorage.getItem(STORAGE_KEY_TEXT_SIZE) || 'normal';
  document.documentElement.setAttribute('data-text-size', savedTextSize);

  const textSizeBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-secondary',
      'aria-label': 'Adjust text size',
      title: 'Cycle text size (Normal, Large, Extra Large)'
    },
    `Aa (${savedTextSize.toUpperCase().slice(0, 1)})`
  );

  textSizeBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-text-size') || 'normal';
    const next = current === 'normal' ? 'large' : current === 'large' ? 'xlarge' : 'normal';
    document.documentElement.setAttribute('data-text-size', next);
    localStorage.setItem(STORAGE_KEY_TEXT_SIZE, next);
    textSizeBtn.textContent = `Aa (${next.toUpperCase().slice(0, 1)})`;
    announceToScreenReader(`Text size set to ${next}`);
  });

  // 4. Digest Button ("What do I need to know this week?")
  const digestBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-primary',
      'aria-label': 'What do I need to know this week? Generate weekly digest',
      title: 'Generate weekly digest'
    },
    '✨ Weekly Digest'
  );
  digestBtn.addEventListener('click', callbacks.onOpenDigest);

  // 5. Profile Button
  const profileBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-secondary',
      'aria-label': 'Open profile and personalisation settings',
      title: 'Filter by department and year'
    },
    '👤 Profile'
  );
  profileBtn.addEventListener('click', callbacks.onOpenProfile);

  const controls = el(
    'div',
    { className: 'header-controls' },
    digestBtn,
    profileBtn,
    themeBtn,
    textSizeBtn
  );

  container.appendChild(brand);
  container.appendChild(controls);
}
