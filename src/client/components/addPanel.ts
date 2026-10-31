import { el } from '../utils/dom.ts';
import { ExtractedItem } from '../../server/schemas/api.ts';
import { openPreviewModal } from './previewModal.ts';
import { showToast, announceToScreenReader } from './toast.ts';
import { CampusItem } from '../../shared/types.ts';

const SAMPLE_NOTICES = [
  'Kal 5 baje seminar hall mein Google placement talk hai for CSE 3rd year students. Bring your resumes and be on time!',
  'All IT 2nd year students: DAA Lab Practical Exam on 2026-11-15 from 10:00 to 12:00 in Lab 2. Submit record files before 5 PM today.',
  'Robotics Club Workshop this Friday from 14:00 to 16:30 in Auditorium. Open to all branches and all years. Free entry!'
];

export interface AddPanelCallbacks {
  onItemSaved: (item: CampusItem) => void;
}

export function initAddPanel(callbacks: AddPanelCallbacks): void {
  const container = document.getElementById('add-section');
  if (!container) return;
  container.textContent = '';

  let currentSampleIdx = 0;

  // Textarea input
  const textarea = el('textarea', {
    id: 'notice-input',
    className: 'textarea-input',
    placeholder: 'Forwarded message, WhatsApp notice, email, or poster caption...',
    maxLength: 5000,
    rows: 4
  }) as HTMLTextAreaElement;

  const charCounter = el('span', {
    id: 'char-counter',
    style: 'font-size: var(--font-xs); color: var(--text-muted); margin-left: auto;'
  }, '0 / 5,000');

  textarea.addEventListener('input', () => {
    charCounter.textContent = `${textarea.value.length.toLocaleString()} / 5,000`;
  });

  // Extract button
  const extractBtn = el(
    'button',
    {
      type: 'button',
      id: 'extract-btn',
      className: 'btn btn-primary',
      'aria-label': 'Extract events with AI'
    },
    '⚡ Extract Event'
  ) as HTMLButtonElement;

  // Sample button
  const sampleBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-secondary',
      'aria-label': 'Try a sample notice'
    },
    '💡 Try Sample Notice'
  );

  sampleBtn.addEventListener('click', () => {
    const sample = SAMPLE_NOTICES[currentSampleIdx % SAMPLE_NOTICES.length];
    currentSampleIdx++;
    textarea.value = sample;
    textarea.dispatchEvent(new Event('input'));
    textarea.focus();
    showToast('Sample notice loaded. Click "Extract Event" to parse!');
  });

  // Voice Speech Recognition button (PRD Bonus 3)
  let voiceBtn: HTMLButtonElement | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (SpeechRecognition) {
    let recognition: {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onstart: (() => void) | null;
      onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    } | null = null;
    let isListening = false;

    voiceBtn = el(
      'button',
      {
        type: 'button',
        className: 'btn btn-secondary',
        'aria-label': 'Voice input in English or Hindi',
        title: 'Voice input (Web Speech API)'
      },
      '🎤 Voice'
    ) as HTMLButtonElement;

    voiceBtn.addEventListener('click', () => {
      if (isListening && recognition) {
        recognition.stop();
        return;
      }

      try {
        const rec = new SpeechRecognition();
        recognition = rec;
        rec.lang = 'en-IN'; // Default to Indian English, also supports Hinglish
        rec.interimResults = false;
        rec.continuous = false;

        rec.onstart = () => {
          isListening = true;
          if (voiceBtn) {
            voiceBtn.textContent = '🔴 Listening...';
            voiceBtn.classList.add('btn-danger');
          }
          announceToScreenReader('Listening for speech...');
        };

        rec.onresult = (e: { results: Array<Array<{ transcript: string }>> }) => {
          const transcript = e.results[0]?.[0]?.transcript;
          if (transcript) {
            textarea.value = textarea.value ? `${textarea.value} ${transcript}` : transcript;
            textarea.dispatchEvent(new Event('input'));
            showToast(`Heard: "${transcript}"`);
          }
        };

        rec.onerror = () => {
          announceToScreenReader('Voice input encountered an error.');
        };

        rec.onend = () => {
          isListening = false;
          if (voiceBtn) {
            voiceBtn.textContent = '🎤 Voice';
            voiceBtn.classList.remove('btn-danger');
          }
          announceToScreenReader('Microphone closed.');
        };

        rec.start();
      } catch {
        showToast('Voice input is not available on this device.');
      }
    });
  }

  // Extract action handler
  extractBtn.addEventListener('click', async () => {
    const textVal = textarea.value.trim();
    if (!textVal) {
      showToast('Please paste a notice or try a sample notice first!');
      textarea.focus();
      return;
    }

    extractBtn.disabled = true;
    extractBtn.textContent = '⏳ Extracting...';
    announceToScreenReader('Extracting event details. Please wait...');

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textVal })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'Extraction failed' }));
        throw new Error(errJson.error || 'Server error during extraction');
      }

      const data: { items: ExtractedItem[]; source: 'ai' | 'offline' } = await response.json();

      if (!data.items || data.items.length === 0) {
        showToast('No events found in this text. Try editing the notice.');
        return;
      }

      // Show preview for each item (first item immediately)
      const firstItem = data.items[0];
      openPreviewModal({
        item: firstItem,
        source: data.source,
        triggerElement: extractBtn,
        onSave: (savedItem) => {
          callbacks.onItemSaved(savedItem);
          textarea.value = '';
          textarea.dispatchEvent(new Event('input'));
          showToast(`Saved "${savedItem.title}" to My Items!`);
        }
      });
    } catch (err) {
      console.error('Extract error:', err);
      showToast((err as Error).message || 'Failed to extract event. Please try again.');
    } finally {
      extractBtn.disabled = false;
      extractBtn.textContent = '⚡ Extract Event';
    }
  });

  const actionsLeft = el(
    'div',
    { className: 'input-actions-left' },
    sampleBtn,
    voiceBtn
  );

  const actions = el(
    'div',
    { className: 'input-actions' },
    actionsLeft,
    extractBtn
  );

  const panel = el(
    'div',
    { className: 'card-panel' },
    el(
      'div',
      { className: 'textarea-container' },
      el(
        'div',
        { style: 'display: flex; justify-content: space-between; align-items: baseline;' },
        el('label', { htmlFor: 'notice-input', id: 'add-panel-heading', className: 'form-label' }, 'Paste a notice, email or poster caption'),
        charCounter
      ),
      el('p', { style: 'font-size: var(--font-xs); margin-bottom: 0.25rem;' }, 'Paste forwarded WhatsApp notices, email circulars, or Hinglish event messages.'),
      textarea
    ),
    actions
  );

  container.appendChild(panel);
}
