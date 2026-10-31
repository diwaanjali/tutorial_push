import { initHeader } from './components/header.ts';
import { initAttentionBanner } from './components/attention.ts';
import { initAddPanel } from './components/addPanel.ts';
import { initItemsView } from './components/itemsView.ts';
import { storageService } from './storage/localStorage.ts';
import { showToast } from './components/toast.ts';
import { openWeeklyDigestModal } from './components/digestModal.ts';
import { openProfileModal } from './components/profileModal.ts';

let currentViewMode: 'list' | 'calendar' = 'list';

function refreshAllViews(): void {
  // Re-render attention banner and items view
  initAttentionBanner();

  initItemsView({
    currentView: currentViewMode,
    onViewToggled: (newView) => {
      currentViewMode = newView;
      refreshAllViews();
    },
    onItemsChanged: () => {
      refreshAllViews();
    }
  });

  // Attention banner update (dispatched via custom event or re-render)
  const attentionEvent = new CustomEvent('campuspulse:items-updated');
  window.dispatchEvent(attentionEvent);
}

function initApp(): void {
  // 1. Header with callbacks
  initHeader({
    onOpenDigest: () => {
      openWeeklyDigestModal();
    },
    onOpenProfile: () => {
      openProfileModal({
        onProfileUpdated: () => {
          refreshAllViews();
        }
      });
    }
  });

  // Listen for custom events
  window.addEventListener('campuspulse:open-digest', () => {
    openWeeklyDigestModal();
  });

  window.addEventListener('campuspulse:open-profile', () => {
    openProfileModal({
      onProfileUpdated: () => {
        refreshAllViews();
      }
    });
  });

  // 2. Attention Banner
  initAttentionBanner();

  // 3. Add Panel
  initAddPanel({
    onItemSaved: (item) => {
      storageService.addItem(item);
      refreshAllViews();
    }
  });

  // 4. Items View
  refreshAllViews();

  console.log('Campus Pulse client initialized cleanly.');
}

// Bootstrap when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Window error listener for friendly error toasts
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showToast('An unexpected issue occurred. Please try again.');
});
