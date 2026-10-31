import { CampusItem } from '../../shared/types.ts';
import { calculateItemStatus, isTodayItem } from './status.ts';
import { showToast } from '../components/toast.ts';

export class NotificationManager {
  private hasPermission = false;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.hasPermission = Notification.permission === 'granted';
    }
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  getPermissionState(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      showToast('Browser notifications are not supported on this device. In-app reminders will be used.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      if (this.hasPermission) {
        showToast('Browser reminders enabled! You will be alerted for urgent campus items.');
      } else {
        showToast('Notifications disabled. In-app reminders will still keep you updated.');
      }
      return this.hasPermission;
    } catch {
      return false;
    }
  }

  checkAndNotifyUrgentItems(items: CampusItem[]): void {
    const urgentItems = items.filter((item) => {
      const status = calculateItemStatus(item);
      return status === 'urgent' || isTodayItem(item);
    });

    if (urgentItems.length === 0) return;

    if (this.hasPermission && this.isSupported()) {
      // Send browser notification for top urgent item
      const top = urgentItems[0];
      try {
        new Notification(`Campus Pulse: ${top.title}`, {
          body: `${top.isDeadline ? '🚨 Deadline due soon!' : '⏰ Upcoming today'} - ${top.time ? `At ${top.time}` : 'Scheduled for today'}. Venue: ${top.venue || 'Campus'}`,
          icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231a73e8"%3E%3Cpath d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/%3E%3C/svg%3E'
        });
      } catch (err) {
        console.warn('Could not display system notification:', err);
      }
    }
  }
}

export const notificationManager = new NotificationManager();
