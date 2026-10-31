/**
 * Safe DOM helper library.
 * Direct innerHTML is strictly banned across this codebase for prompt-injection defence and XSS immunity.
 */

type Child = HTMLElement | SVGElement | Text | string | number | null | undefined | false;

type AttributeValue =
  | string
  | boolean
  | number
  | null
  | undefined
  | ((event: Event) => void)
  | Record<string, string>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attrs: Record<string, AttributeValue> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) {
      continue;
    }

    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element.addEventListener(eventName, value as any);
    } else if (key === 'className') {
      element.className = String(value);
    } else if (key === 'dataset' && typeof value === 'object') {
      for (const [dKey, dVal] of Object.entries(value as Record<string, string>)) {
        element.dataset[dKey] = dVal;
      }
    } else if (typeof value === 'boolean') {
      if (value) element.setAttribute(key, '');
    } else {
      element.setAttribute(key, String(value));
    }
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) {
      continue;
    }
    if (typeof child === 'string' || typeof child === 'number') {
      element.appendChild(document.createTextNode(String(child)));
    } else {
      element.appendChild(child);
    }
  }

  return element;
}

export function text(content: string): Text {
  return document.createTextNode(content);
}

/**
 * Creates SVG element safely without innerHTML
 */
export function createSvg(
  viewBox: string,
  dPath: string,
  attrs: Record<string, string> = {}
): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', attrs.width || '18');
  svg.setAttribute('height', attrs.height || '18');
  svg.setAttribute('fill', attrs.fill || 'currentColor');

  for (const [k, v] of Object.entries(attrs)) {
    if (!['width', 'height', 'fill'].includes(k)) {
      svg.setAttribute(k, v);
    }
  }

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', dPath);
  svg.appendChild(path);

  return svg;
}

/**
 * Accessible focus trap for modal dialogs (WCAG 2.2 AA)
 */
export function setupFocusTrap(container: HTMLElement, onEscape?: () => void): () => void {
  const focusableSelector =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && onEscape) {
      e.preventDefault();
      onEscape();
      return;
    }

    if (e.key !== 'Tab') return;

    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(focusableSelector)
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);

  // Focus the first focusable element
  requestAnimationFrame(() => {
    const firstFocusable = container.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();
  });

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}
