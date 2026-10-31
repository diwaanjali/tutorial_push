import { CampusItem, ClashInfo } from '../../shared/types.ts';

function parseTimeToMinutes(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

interface ItemTimeInterval {
  id: string;
  title: string;
  date: string;
  start: number;
  end: number;
}

function getItemInterval(item: CampusItem): ItemTimeInterval | null {
  if (!item.date || !item.time) return null;

  const start = parseTimeToMinutes(item.time);
  if (start === null) return null;

  let end = parseTimeToMinutes(item.endTime);
  if (end === null || end <= start) {
    // Default duration 1 hour (60 minutes) when no end time or invalid
    end = start + 60;
  }

  return {
    id: item.id,
    title: item.title,
    date: item.date,
    start,
    end
  };
}

export function doIntervalsOverlap(a: ItemTimeInterval, b: ItemTimeInterval): boolean {
  if (a.date !== b.date) return false;
  // Overlap condition: startA < endB && startB < endA
  return a.start < b.end && b.start < a.end;
}

/**
 * Detects clashes across an entire list of CampusItems.
 * Returns a Map keyed by item ID with its conflict details.
 */
export function detectClashes(items: CampusItem[]): Map<string, ClashInfo> {
  const clashMap = new Map<string, ClashInfo>();

  // Initialize map
  for (const item of items) {
    clashMap.set(item.id, {
      hasClash: false,
      conflictingItemIds: [],
      conflictingTitles: []
    });
  }

  // Extract valid intervals
  const intervals: ItemTimeInterval[] = [];
  for (const item of items) {
    const interval = getItemInterval(item);
    if (interval) {
      intervals.push(interval);
    }
  }

  // Compare all pairs
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      const a = intervals[i];
      const b = intervals[j];

      if (doIntervalsOverlap(a, b)) {
        const infoA = clashMap.get(a.id)!;
        infoA.hasClash = true;
        if (!infoA.conflictingItemIds.includes(b.id)) {
          infoA.conflictingItemIds.push(b.id);
          infoA.conflictingTitles.push(b.title);
        }

        const infoB = clashMap.get(b.id)!;
        infoB.hasClash = true;
        if (!infoB.conflictingItemIds.includes(a.id)) {
          infoB.conflictingItemIds.push(a.id);
          infoB.conflictingTitles.push(a.title);
        }
      }
    }
  }

  return clashMap;
}

/**
 * Checks if a newly created or edited item clashes with any existing items.
 * Returns list of conflicting existing items.
 */
export function checkNewItemClashes(
  candidate: CampusItem,
  existingItems: CampusItem[]
): CampusItem[] {
  const candidateInterval = getItemInterval(candidate);
  if (!candidateInterval) return [];

  const conflicts: CampusItem[] = [];

  for (const existing of existingItems) {
    if (existing.id === candidate.id) continue;
    const existingInterval = getItemInterval(existing);
    if (existingInterval && doIntervalsOverlap(candidateInterval, existingInterval)) {
      conflicts.push(existing);
    }
  }

  return conflicts;
}

