import { describe, it, expect } from 'vitest';
import {
  calculateItemStatus,
  formatDateISO,
  isTodayItem,
  getEventExpirationDate
} from '../../src/client/logic/status.ts';
import { CampusItem } from '../../src/shared/types.ts';

function createMockItem(overrides: Partial<CampusItem> = {}): CampusItem {
  return {
    id: 'test-1',
    title: 'CS 101 Lecture',
    date: '2026-11-01',
    time: '10:00',
    endTime: '11:00',
    venue: 'Hall A',
    category: 'Academic',
    isDeadline: false,
    summary: 'Standard lecture',
    audience: { department: null, year: null },
    language: 'en',
    source: 'manual',
    createdAt: '2026-10-31T00:00:00.000Z',
    ...overrides
  };
}

describe('Status Logic', () => {
  const referenceNow = new Date(2026, 10, 1, 9, 0, 0); // Nov 1, 2026, 09:00:00

  it('correctly identifies expired events when event end time has passed', () => {
    const item = createMockItem({
      date: '2026-10-31',
      time: '14:00',
      endTime: '15:00'
    });
    const status = calculateItemStatus(item, referenceNow);
    expect(status).toBe('expired');
  });

  it('correctly identifies urgent events within the next 48 hours', () => {
    // Event is on Nov 2 at 10:00 (25 hours away)
    const item = createMockItem({
      date: '2026-11-02',
      time: '10:00',
      endTime: '11:00'
    });
    const status = calculateItemStatus(item, referenceNow);
    expect(status).toBe('urgent');
  });

  it('correctly identifies upcoming events beyond 48 hours', () => {
    // Event is on Nov 10 (9 days away)
    const item = createMockItem({
      date: '2026-11-10',
      time: '10:00',
      endTime: '11:00'
    });
    const status = calculateItemStatus(item, referenceNow);
    expect(status).toBe('upcoming');
  });

  it('handles deadlines due today as urgent', () => {
    const item = createMockItem({
      date: '2026-11-01',
      isDeadline: true,
      time: null,
      endTime: null
    });
    const status = calculateItemStatus(item, referenceNow);
    expect(status).toBe('urgent');
  });

  it('handles deadlines due tomorrow as urgent', () => {
    const item = createMockItem({
      date: '2026-11-02',
      isDeadline: true,
      time: null,
      endTime: null
    });
    const status = calculateItemStatus(item, referenceNow);
    expect(status).toBe('urgent');
  });

  it('deadline item expires at the end of that day (23:59:59.999)', () => {
    const item = createMockItem({
      date: '2026-11-01',
      isDeadline: true
    });
    const expDate = getEventExpirationDate(item);
    expect(expDate?.getHours()).toBe(23);
    expect(expDate?.getMinutes()).toBe(59);

    // At 23:30 on Nov 1, it is still active/urgent
    const lateNov1 = new Date(2026, 10, 1, 23, 30, 0);
    expect(calculateItemStatus(item, lateNov1)).toBe('urgent');

    // On Nov 2 at 00:01, it is expired
    const earlyNov2 = new Date(2026, 10, 2, 0, 1, 0);
    expect(calculateItemStatus(item, earlyNov2)).toBe('expired');
  });

  it('handles items with missing date gracefully as upcoming', () => {
    const item = createMockItem({
      date: null,
      time: null
    });
    expect(calculateItemStatus(item, referenceNow)).toBe('upcoming');
  });

  it('detects isTodayItem accurately', () => {
    const todayItem = createMockItem({ date: '2026-11-01' });
    const tomorrowItem = createMockItem({ date: '2026-11-02' });

    expect(isTodayItem(todayItem, referenceNow)).toBe(true);
    expect(isTodayItem(tomorrowItem, referenceNow)).toBe(false);
  });

  it('formats dates to ISO string properly', () => {
    const d = new Date(2026, 9, 31); // October 31, 2026
    expect(formatDateISO(d)).toBe('2026-10-31');
  });
});
