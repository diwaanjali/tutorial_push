import { describe, it, expect } from 'vitest';
import { parseNoticeOffline } from '../../src/server/services/offlineParser.ts';

describe('Offline Rule-based Parser (English & Hinglish)', () => {
  const referenceToday = '2026-11-01'; // Sunday, Nov 1, 2026

  it('correctly parses Hinglish placement fixture: "Kal 5 baje seminar hall mein placement talk hai"', () => {
    const text = 'Kal 5 baje seminar hall mein placement talk hai for CSE 3rd year students. Be on time!';
    const items = parseNoticeOffline(text, referenceToday);

    expect(items.length).toBe(1);
    const item = items[0];
    expect(item.category).toBe('Placement');
    expect(item.language).toBe('Hinglish');
    expect(item.date).toBe('2026-11-02'); // Kal = tomorrow = Nov 2
    expect(item.time).toBe('17:00'); // 5 baje in evening context = 17:00
    expect(item.venue).toMatch(/seminar hall/i);
    expect(item.audience.department).toBe('Computer Science & Engineering');
    expect(item.audience.year).toBe(3);
  });

  it('correctly handles Hinglish word "parso" (day after tomorrow)', () => {
    const text = 'Parso 10:00 AM robotics club workshop hai in Lab 2. All batches invited.';
    const items = parseNoticeOffline(text, referenceToday);

    expect(items.length).toBe(1);
    const item = items[0];
    expect(item.date).toBe('2026-11-03'); // Parso = Nov 3
    expect(item.time).toBe('10:00');
    expect(item.category).toBe('Club');
  });

  it('correctly handles Hinglish word "aaj" (today)', () => {
    const text = 'Aaj last date hai assignment submission ki by 11:59 PM.';
    const items = parseNoticeOffline(text, referenceToday);

    expect(items.length).toBe(1);
    const item = items[0];
    expect(item.date).toBe('2026-11-01'); // Aaj = Nov 1
    expect(item.isDeadline).toBe(true);
    expect(item.category).toBe('Deadline');
  });

  it('correctly parses standard English academic and exam notices with chrono-node', () => {
    const text = 'Midsem examination for Mathematics on November 15, 2026 from 10:00 to 12:00 in Auditorium.';
    const items = parseNoticeOffline(text, referenceToday);

    expect(items.length).toBe(1);
    const item = items[0];
    expect(item.category).toBe('Exam');
    expect(item.date).toBe('2026-11-15');
    expect(item.time).toBe('10:00');
    expect(item.endTime).toBe('12:00');
    expect(item.venue).toMatch(/Auditorium/i);
    expect(item.language).toBe('English');
  });

  it('extracts multiple notices when separated by distinct section delimiters', () => {
    const multiText = `Notice 1:
CSE Hackathon on November 10 at 9:00 AM in Main Audi.

------------------------

Notice 2:
Cricket tournament matches start on November 12 at 8:00 AM in Ground.`;

    const items = parseNoticeOffline(multiText, referenceToday);
    expect(items.length).toBe(2);
    expect(items[0].category).toBe('Event');
    expect(items[1].category).toBe('Sports');
  });
});
