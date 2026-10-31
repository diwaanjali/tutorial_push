import { describe, it, expect } from 'vitest';
import {
  filterAndSortCampusItems,
  isItemRelevantToProfile,
  sortCampusItems
} from '../../src/client/logic/filters.ts';
import { CampusItem, FilterState, UserProfile } from '../../src/shared/types.ts';

function createItem(
  id: string,
  title: string,
  date: string | null,
  time: string | null,
  category: CampusItem['category'],
  department: string | null = null,
  year: number | null = null,
  summary: string = '',
  venue: string = ''
): CampusItem {
  return {
    id,
    title,
    date,
    time,
    endTime: null,
    venue,
    category,
    isDeadline: false,
    summary,
    audience: { department, year },
    language: 'en',
    source: 'manual',
    createdAt: new Date().toISOString()
  };
}

describe('Filters, Search, and Sorting Logic', () => {
  const defaultProfile: UserProfile = {
    department: 'Computer Science & Engineering',
    year: 3,
    filterOnlyRelevant: false
  };

  const defaultFilter: FilterState = {
    searchQuery: '',
    category: 'all',
    dateRange: 'all',
    status: 'all',
    onlyRelevant: false
  };

  const sampleItems: CampusItem[] = [
    createItem('1', 'Hackathon Registration', '2026-11-03', '10:00', 'Event', null, null, 'Register before noon', 'Auditorium'),
    createItem('2', 'Mechanical Lab Exam', '2026-11-01', '14:00', 'Exam', 'Mechanical Engineering', 2, 'Bring lab manual', 'Workshop 3'),
    createItem('3', 'CSE Placement Drive', '2026-11-02', '09:00', 'Placement', 'Computer Science & Engineering', 3, 'Google recruitment talk', 'Main Hall'),
    createItem('4', 'Football Trials', null, null, 'Sports', null, null, 'Campus sports team', 'Ground')
  ];

  it('filters by search query matching title, venue, or summary', () => {
    // Search by title
    const res1 = filterAndSortCampusItems(sampleItems, { ...defaultFilter, searchQuery: 'Hackathon' }, defaultProfile);
    expect(res1.length).toBe(1);
    expect(res1[0].id).toBe('1');

    // Search by venue
    const res2 = filterAndSortCampusItems(sampleItems, { ...defaultFilter, searchQuery: 'Auditorium' }, defaultProfile);
    expect(res2.length).toBe(1);
    expect(res2[0].id).toBe('1');

    // Search by summary
    const res3 = filterAndSortCampusItems(sampleItems, { ...defaultFilter, searchQuery: 'Google' }, defaultProfile);
    expect(res3.length).toBe(1);
    expect(res3[0].id).toBe('3');
  });

  it('filters by category chip', () => {
    const res = filterAndSortCampusItems(sampleItems, { ...defaultFilter, category: 'Placement' }, defaultProfile);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('3');
  });

  it('filters by audience personalisation when onlyRelevant is true', () => {
    const res = filterAndSortCampusItems(
      sampleItems,
      { ...defaultFilter, onlyRelevant: true },
      defaultProfile
    );

    // Item 1 (for everyone) and Item 4 (for everyone) and Item 3 (CSE 3rd year) should match.
    // Item 2 (Mechanical 2nd year) should be excluded.
    const ids = res.map((r) => r.id);
    expect(ids).toContain('1');
    expect(ids).toContain('3');
    expect(ids).toContain('4');
    expect(ids).not.toContain('2');
  });

  it('isItemRelevantToProfile handles null audience as universally accessible', () => {
    const universal = createItem('u', 'General Holiday', '2026-11-10', null, 'Holiday', null, null);
    expect(isItemRelevantToProfile(universal, defaultProfile)).toBe(true);
  });

  it('sorts items chronologically with missing dates at the bottom', () => {
    const sorted = sortCampusItems(sampleItems);
    expect(sorted[0].id).toBe('2'); // 2026-11-01
    expect(sorted[1].id).toBe('3'); // 2026-11-02
    expect(sorted[2].id).toBe('1'); // 2026-11-03
    expect(sorted[3].id).toBe('4'); // null date at bottom
  });
});
