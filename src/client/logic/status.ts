import { CampusItem, ItemStatus } from '../../shared/types.ts';

/**
 * Format a Date object to YYYY-MM-DD in local time
 */
export function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse an item's date and time into an effective Date object.
 * If time is missing:
 * - for deadline items or full-day events: end of day 23:59:59.999
 * - for standard events starting time: start of day 09:00:00 or 00:00:00 depending on purpose
 */
export function getEventExpirationDate(item: CampusItem): Date | null {
  if (!item.date) return null;

  const [yearStr, monthStr, dayStr] = item.date.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  if (item.isDeadline) {
    // PRD: "for deadline items: end of that day"
    return new Date(year, month, day, 23, 59, 59, 999);
  }

  // If non-deadline, consider end time, or start time + 1 hr, or end of day if time is omitted
  if (item.endTime) {
    const [h, m] = item.endTime.split(':').map((v) => parseInt(v, 10));
    return new Date(year, month, day, isNaN(h) ? 23 : h, isNaN(m) ? 59 : m, 59, 999);
  }

  if (item.time) {
    const [h, m] = item.time.split(':').map((v) => parseInt(v, 10));
    // Default duration: 1 hour after start time
    const endHour = isNaN(h) ? 23 : h + 1;
    const endMin = isNaN(m) ? 59 : m;
    return new Date(year, month, day, endHour, endMin, 0, 0);
  }

  // All-day event without time: expires at end of that day
  return new Date(year, month, day, 23, 59, 59, 999);
}

/**
 * Get the starting datetime of an item.
 */
export function getEventStartDate(item: CampusItem): Date | null {
  if (!item.date) return null;

  const [yearStr, monthStr, dayStr] = item.date.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  if (item.time) {
    const [h, m] = item.time.split(':').map((v) => parseInt(v, 10));
    return new Date(year, month, day, isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
  }

  // If no time is specified, defaults to start of that day
  return new Date(year, month, day, 0, 0, 0, 0);
}

/**
 * Computes status: 'expired' | 'urgent' | 'upcoming'
 * Rules:
 * - Expired: datetime has passed (for deadline items: end of that day).
 * - Urgent: within the next 48 hours, or a deadline due today or tomorrow.
 * - Upcoming: everything else in the future.
 */
export function calculateItemStatus(item: CampusItem, referenceDate?: Date): ItemStatus {
  const now = referenceDate ? new Date(referenceDate.getTime()) : new Date();

  const expirationDate = getEventExpirationDate(item);
  if (!expirationDate) {
    return 'upcoming';
  }

  // 1. Check if Expired
  if (expirationDate.getTime() < now.getTime()) {
    return 'expired';
  }

  // 2. Check if Urgent
  const diffMs = expirationDate.getTime() - now.getTime();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;

  // Rule: within the next 48 hours
  if (diffMs <= fortyEightHoursMs && diffMs >= 0) {
    return 'urgent';
  }

  // Rule: deadline due today or tomorrow
  if (item.isDeadline && item.date) {
    const todayStr = formatDateISO(now);
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrowStr = formatDateISO(tomorrow);

    if (item.date === todayStr || item.date === tomorrowStr) {
      return 'urgent';
    }
  }

  // 3. Otherwise Upcoming
  return 'upcoming';
}

/**
 * Checks if an item occurs today
 */
export function isTodayItem(item: CampusItem, referenceDate?: Date): boolean {
  if (!item.date) return false;
  const now = referenceDate ? new Date(referenceDate.getTime()) : new Date();
  const todayStr = formatDateISO(now);
  return item.date === todayStr;
}

