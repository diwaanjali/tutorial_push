import { CampusItem, Category, UserProfile } from '../../shared/types.ts';
import {
  CATEGORIES,
  STORAGE_KEY_ITEMS,
  STORAGE_KEY_PROFILE
} from '../../shared/constants.ts';

const VALID_CATEGORIES = new Set<string>(CATEGORIES);

/**
 * Validates and migrates an unknown item into a valid CampusItem.
 * Returns null if the record is hopelessly corrupted.
 */
export function sanitizeAndMigrateItem(raw: unknown): CampusItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const r = raw as Record<string, unknown>;

  // Must have a valid non-empty title string
  if (typeof r.title !== 'string' || !r.title.trim()) {
    return null;
  }
  const title = r.title.trim().slice(0, 120);
  const id = typeof r.id === 'string' && r.id.trim() ? r.id.trim() : crypto.randomUUID();

  const date = typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : null;
  const time = typeof r.time === 'string' && /^\d{2}:\d{2}$/.test(r.time) ? r.time : null;
  const endTime = typeof r.endTime === 'string' && /^\d{2}:\d{2}$/.test(r.endTime) ? r.endTime : null;
  const venue = typeof r.venue === 'string' ? r.venue.slice(0, 120) : null;

  const category: Category =
    typeof r.category === 'string' && VALID_CATEGORIES.has(r.category)
      ? (r.category as Category)
      : 'Other';

  const isDeadline = Boolean(r.isDeadline);
  const summary = typeof r.summary === 'string' ? r.summary.slice(0, 200) : '';

  // Audience migration
  let audience = { department: null as string | null, year: null as number | null };
  if (r.audience && typeof r.audience === 'object') {
    const aud = r.audience as Record<string, unknown>;
    const dept = typeof aud.department === 'string' ? aud.department.slice(0, 100) : null;
    const yr = typeof aud.year === 'number' && [1, 2, 3, 4].includes(aud.year) ? aud.year : null;
    audience = { department: dept, year: yr };
  }

  const language = typeof r.language === 'string' ? r.language.slice(0, 20) : 'en';
  const source = r.source === 'ai' || r.source === 'offline' || r.source === 'manual' ? r.source : 'manual';
  const createdAt = typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString();

  return {
    id,
    title,
    date,
    time,
    endTime,
    venue,
    category,
    isDeadline,
    summary,
    audience,
    language,
    source,
    createdAt
  };
}

export class StorageService {
  private lastDeletedItem: CampusItem | null = null;

  /**
   * Safe load with corruption recovery and item-by-item migration
   */
  loadItems(): CampusItem[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        console.warn('Storage corrupted: expected array. Resetting.');
        return [];
      }

      const validItems: CampusItem[] = [];
      for (const item of parsed) {
        const sanitized = sanitizeAndMigrateItem(item);
        if (sanitized) {
          validItems.push(sanitized);
        }
      }

      return validItems;
    } catch (err) {
      console.error('Failed to parse items from localStorage:', err);
      return [];
    }
  }

  /**
   * Safe save
   */
  saveItems(items: CampusItem[]): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
      return true;
    } catch (err) {
      console.error('Failed to save items to localStorage:', err);
      return false;
    }
  }

  addItem(item: CampusItem): boolean {
    const items = this.loadItems();
    items.push(item);
    return this.saveItems(items);
  }

  updateItem(updated: CampusItem): boolean {
    const items = this.loadItems();
    const idx = items.findIndex((i) => i.id === updated.id);
    if (idx === -1) return false;
    items[idx] = updated;
    return this.saveItems(items);
  }

  deleteItem(id: string): CampusItem | null {
    const items = this.loadItems();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    const [deleted] = items.splice(idx, 1);
    this.lastDeletedItem = deleted;
    this.saveItems(items);
    return deleted;
  }

  getLastDeletedItem(): CampusItem | null {
    return this.lastDeletedItem;
  }

  restoreLastDeletedItem(): CampusItem | null {
    if (!this.lastDeletedItem) return null;
    const restored = this.lastDeletedItem;
    this.addItem(restored);
    this.lastDeletedItem = null;
    return restored;
  }

  loadUserProfile(): UserProfile {
    const defaultProfile: UserProfile = {
      department: null,
      year: null,
      filterOnlyRelevant: false
    };

    try {
      if (typeof localStorage === 'undefined') return defaultProfile;
      const raw = localStorage.getItem(STORAGE_KEY_PROFILE);
      if (!raw) return defaultProfile;

      const parsed = JSON.parse(raw);
      return {
        department: typeof parsed.department === 'string' ? parsed.department : null,
        year: typeof parsed.year === 'number' && [1, 2, 3, 4].includes(parsed.year) ? parsed.year : null,
        filterOnlyRelevant: Boolean(parsed.filterOnlyRelevant)
      };
    } catch {
      return defaultProfile;
    }
  }

  saveUserProfile(profile: UserProfile): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
      return true;
    } catch (err) {
      console.error('Failed to save user profile:', err);
      return false;
    }
  }

  clearAllData(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_ITEMS);
        localStorage.removeItem(STORAGE_KEY_PROFILE);
      }
    } catch (err) {
      console.error('Failed to clear storage:', err);
    }
  }
}

export const storageService = new StorageService();
