export type Category =
  | 'Academic'
  | 'Exam'
  | 'Event'
  | 'Club'
  | 'Sports'
  | 'Placement'
  | 'Deadline'
  | 'Holiday'
  | 'Other';

export interface Audience {
  department: string | null;
  year: number | null;
}

export type ItemSource = 'ai' | 'offline' | 'manual';

export interface CampusItem {
  id: string; // crypto.randomUUID()
  title: string; // max 120
  date: string | null; // ISO yyyy-mm-dd
  time: string | null; // HH:mm 24h
  endTime: string | null; // HH:mm 24h
  venue: string | null; // max 120
  category: Category;
  isDeadline: boolean;
  summary: string; // max 200
  audience: Audience; // null = everyone
  language: string;
  source: ItemSource;
  createdAt: string; // ISO datetime
}

export type ItemStatus = 'urgent' | 'upcoming' | 'expired';

export interface ClashInfo {
  hasClash: boolean;
  conflictingItemIds: string[];
  conflictingTitles: string[];
}

export interface UserProfile {
  department: string | null;
  year: number | null;
  filterOnlyRelevant: boolean;
}

export type DateRangeFilter = 'all' | 'today' | 'week';
export type StatusFilter = 'all' | 'urgent' | 'upcoming' | 'expired';

export interface FilterState {
  searchQuery: string;
  category: Category | 'all';
  dateRange: DateRangeFilter;
  status: StatusFilter;
  onlyRelevant: boolean;
}
