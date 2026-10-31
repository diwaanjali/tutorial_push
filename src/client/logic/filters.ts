import {
  CampusItem,
  FilterState,
  UserProfile
} from '../../shared/types.ts';
import { calculateItemStatus, formatDateISO } from './status.ts';

export function isItemRelevantToProfile(
  item: CampusItem,
  profile: Pick<UserProfile, 'department' | 'year'>
): boolean {
  // If item has no specific audience restrictions, it's for everyone
  const deptMatch =
    item.audience.department === null ||
    item.audience.department === '' ||
    profile.department === null ||
    item.audience.department.toLowerCase() === profile.department.toLowerCase();

  const yearMatch =
    item.audience.year === null ||
    profile.year === null ||
    item.audience.year === profile.year;

  return deptMatch && yearMatch;
}

export function isItemInDateRange(
  item: CampusItem,
  range: FilterState['dateRange'],
  referenceDate?: Date
): boolean {
  if (range === 'all') return true;
  if (!item.date) return false;

  const now = referenceDate ? new Date(referenceDate.getTime()) : new Date();
  const todayStr = formatDateISO(now);

  if (range === 'today') {
    return item.date === todayStr;
  }

  if (range === 'week') {
    // Next 7 days including today
    const weekAhead = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    const weekAheadStr = formatDateISO(weekAhead);
    return item.date >= todayStr && item.date <= weekAheadStr;
  }

  return true;
}

export function sortCampusItems(items: CampusItem[]): CampusItem[] {
  return [...items].sort((a, b) => {
    // Missing dates go to the bottom
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;

    // Compare dates
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }

    // Compare times
    const timeA = a.time || '23:59';
    const timeB = b.time || '23:59';
    return timeA.localeCompare(timeB);
  });
}

export function filterAndSortCampusItems(
  items: CampusItem[],
  filterState: FilterState,
  profile: UserProfile,
  referenceDate?: Date
): CampusItem[] {
  const query = filterState.searchQuery.trim().toLowerCase();

  const filtered = items.filter((item) => {
    // 1. Search Query (title, venue, summary)
    if (query.length > 0) {
      const titleMatch = item.title.toLowerCase().includes(query);
      const venueMatch = (item.venue || '').toLowerCase().includes(query);
      const summaryMatch = item.summary.toLowerCase().includes(query);
      if (!titleMatch && !venueMatch && !summaryMatch) {
        return false;
      }
    }

    // 2. Category Filter
    if (filterState.category !== 'all' && item.category !== filterState.category) {
      return false;
    }

    // 3. Date Range Filter
    if (!isItemInDateRange(item, filterState.dateRange, referenceDate)) {
      return false;
    }

    // 4. Status Filter
    if (filterState.status !== 'all') {
      const itemStatus = calculateItemStatus(item, referenceDate);
      if (itemStatus !== filterState.status) {
        return false;
      }
    }

    // 5. Personalisation (Audience) Filter
    if (filterState.onlyRelevant && !isItemRelevantToProfile(item, profile)) {
      return false;
    }

    return true;
  });

  return sortCampusItems(filtered);
}
