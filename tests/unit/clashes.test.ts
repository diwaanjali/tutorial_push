import { describe, it, expect } from 'vitest';
import {
  detectClashes,
  checkNewItemClashes
} from '../../src/client/logic/clashes.ts';
import { CampusItem } from '../../src/shared/types.ts';

function createItem(
  id: string,
  title: string,
  date: string,
  time: string,
  endTime: string | null = null
): CampusItem {
  return {
    id,
    title,
    date,
    time,
    endTime,
    venue: 'Seminar Hall',
    category: 'Event',
    isDeadline: false,
    summary: 'Test summary',
    audience: { department: null, year: null },
    language: 'en',
    source: 'manual',
    createdAt: new Date().toISOString()
  };
}

describe('Clash Detection Logic', () => {
  it('detects exact overlapping time ranges on the same date', () => {
    const itemA = createItem('1', 'Hackathon Briefing', '2026-11-05', '10:00', '11:30');
    const itemB = createItem('2', 'Placement Orientation', '2026-11-05', '10:00', '11:00');

    const clashMap = detectClashes([itemA, itemB]);
    expect(clashMap.get('1')?.hasClash).toBe(true);
    expect(clashMap.get('1')?.conflictingItemIds).toContain('2');
    expect(clashMap.get('2')?.hasClash).toBe(true);
    expect(clashMap.get('2')?.conflictingItemIds).toContain('1');
  });

  it('detects partial overlapping time ranges', () => {
    const itemA = createItem('1', 'Maths Tutorial', '2026-11-05', '14:00', '15:30');
    const itemB = createItem('2', 'Robotics Club', '2026-11-05', '15:00', '16:30');

    const clashMap = detectClashes([itemA, itemB]);
    expect(clashMap.get('1')?.hasClash).toBe(true);
    expect(clashMap.get('2')?.hasClash).toBe(true);
  });

  it('defaults duration to 1 hour when endTime is omitted', () => {
    // itemA has no endTime, so it runs 11:00 - 12:00
    const itemA = createItem('1', 'AI Seminar', '2026-11-05', '11:00', null);
    const itemB = createItem('2', 'Coding Contest', '2026-11-05', '11:30', '12:30');

    const clashMap = detectClashes([itemA, itemB]);
    expect(clashMap.get('1')?.hasClash).toBe(true);
    expect(clashMap.get('2')?.hasClash).toBe(true);
  });

  it('does NOT clash when events are adjacent (end time matches start time)', () => {
    const itemA = createItem('1', 'Morning Session', '2026-11-05', '09:00', '10:00');
    const itemB = createItem('2', 'Keynote Speech', '2026-11-05', '10:00', '11:00');

    const clashMap = detectClashes([itemA, itemB]);
    expect(clashMap.get('1')?.hasClash).toBe(false);
    expect(clashMap.get('2')?.hasClash).toBe(false);
  });

  it('does NOT clash when events are on different dates', () => {
    const itemA = createItem('1', 'Day 1 Event', '2026-11-05', '10:00', '11:00');
    const itemB = createItem('2', 'Day 2 Event', '2026-11-06', '10:00', '11:00');

    const clashMap = detectClashes([itemA, itemB]);
    expect(clashMap.get('1')?.hasClash).toBe(false);
    expect(clashMap.get('2')?.hasClash).toBe(false);
  });

  it('identifies candidate clashes against existing items via checkNewItemClashes', () => {
    const existing1 = createItem('ex1', 'Existing Workshop', '2026-11-05', '10:00', '12:00');
    const existing2 = createItem('ex2', 'Other Day Event', '2026-11-06', '10:00', '11:00');

    const newItem = createItem('new1', 'Conflicting Pitch', '2026-11-05', '11:00', '12:30');

    const conflicts = checkNewItemClashes(newItem, [existing1, existing2]);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].id).toBe('ex1');
    expect(conflicts[0].title).toBe('Existing Workshop');
  });
});
