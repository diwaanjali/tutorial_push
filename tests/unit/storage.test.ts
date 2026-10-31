import { describe, it, expect, beforeEach } from 'vitest';
import {
  StorageService,
  sanitizeAndMigrateItem
} from '../../src/client/storage/localStorage.ts';
import { CampusItem } from '../../src/shared/types.ts';

// Mock localStorage for Node test environment
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe('Storage Layer & Corruption Recovery', () => {
  let storage: StorageService;

  beforeEach(() => {
    // Install mock localStorage globally
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = new MockLocalStorage();
    storage = new StorageService();
  });

  it('saves and loads campus items correctly', () => {
    const item: CampusItem = {
      id: 'item-1',
      title: 'Workshop',
      date: '2026-11-04',
      time: '14:00',
      endTime: '16:00',
      venue: 'Lab 2',
      category: 'Club',
      isDeadline: false,
      summary: 'Robotics Workshop',
      audience: { department: 'Information Technology', year: 2 },
      language: 'en',
      source: 'manual',
      createdAt: new Date().toISOString()
    };

    expect(storage.saveItems([item])).toBe(true);
    const loaded = storage.loadItems();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('item-1');
    expect(loaded[0].title).toBe('Workshop');
  });

  it('recovers gracefully from corrupted JSON in localStorage', () => {
    // Set corrupted string
    localStorage.setItem('campusPulse.v1', '{ invalid json [}');

    // Should not throw, should return empty array
    const loaded = storage.loadItems();
    expect(loaded).toEqual([]);
  });

  it('recovers gracefully when localStorage contains a non-array value', () => {
    localStorage.setItem('campusPulse.v1', JSON.stringify({ notAnArray: true }));

    const loaded = storage.loadItems();
    expect(loaded).toEqual([]);
  });

  it('sanitizes and migrates incomplete or malformed objects in array', () => {
    const valid = {
      id: 'v1',
      title: 'Valid Event',
      date: '2026-11-01',
      category: 'Event'
    };
    const corruptedMissingTitle = {
      id: 'c1'
      // missing title
    };
    const partialItem = {
      title: 'Partial Item',
      category: 'NonExistentCategory'
    };

    localStorage.setItem(
      'campusPulse.v1',
      JSON.stringify([valid, corruptedMissingTitle, partialItem])
    );

    const loaded = storage.loadItems();
    // corruptedMissingTitle is skipped because it has no title
    // partialItem gets migrated with a generated id and category 'Other'
    expect(loaded.length).toBe(2);
    expect(loaded[0].title).toBe('Valid Event');
    expect(loaded[1].title).toBe('Partial Item');
    expect(loaded[1].category).toBe('Other');
    expect(loaded[1].id).toBeDefined();
  });

  it('sanitizeAndMigrateItem rejects null, non-objects, and missing titles', () => {
    expect(sanitizeAndMigrateItem(null)).toBeNull();
    expect(sanitizeAndMigrateItem('string-not-object')).toBeNull();
    expect(sanitizeAndMigrateItem({ title: '   ' })).toBeNull();
    expect(sanitizeAndMigrateItem({ noTitle: true })).toBeNull();
  });

  it('supports delete and undo delete', () => {
    const item: CampusItem = {
      id: 'del-1',
      title: 'To Be Deleted',
      date: '2026-11-05',
      time: null,
      endTime: null,
      venue: null,
      category: 'Other',
      isDeadline: false,
      summary: 'Delete test',
      audience: { department: null, year: null },
      language: 'en',
      source: 'manual',
      createdAt: new Date().toISOString()
    };

    storage.saveItems([item]);
    expect(storage.loadItems().length).toBe(1);

    const deleted = storage.deleteItem('del-1');
    expect(deleted?.id).toBe('del-1');
    expect(storage.loadItems().length).toBe(0);

    const restored = storage.restoreLastDeletedItem();
    expect(restored?.id).toBe('del-1');
    expect(storage.loadItems().length).toBe(1);
    expect(storage.loadItems()[0].title).toBe('To Be Deleted');
  });

  it('loads and saves user profile with safe defaults', () => {
    const defaultProfile = storage.loadUserProfile();
    expect(defaultProfile.department).toBeNull();
    expect(defaultProfile.year).toBeNull();
    expect(defaultProfile.filterOnlyRelevant).toBe(false);

    storage.saveUserProfile({
      department: 'Computer Science & Engineering',
      year: 4,
      filterOnlyRelevant: true
    });

    const loaded = storage.loadUserProfile();
    expect(loaded.department).toBe('Computer Science & Engineering');
    expect(loaded.year).toBe(4);
    expect(loaded.filterOnlyRelevant).toBe(true);
  });
});
