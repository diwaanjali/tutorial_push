import * as chrono from 'chrono-node';
import { Category } from '../../shared/types.ts';
import { ExtractedItem } from '../schemas/api.ts';

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  Placement: ['placement', 'interview', 'ctc', 'recruitment', 'hiring', 'resume', 'drive', 'internship', 'intern', 'job'],
  Exam: ['exam', 'examination', 'midsem', 'endsem', 'quiz', 'viva', 'test', 'practical exam', 'assessment'],
  Deadline: ['deadline', 'due date', 'due by', 'due', 'submit', 'submission', 'last date', 'last day', 'register before'],
  Club: ['club', 'society', 'gdsc', 'ieee', 'acm', 'rotaract', 'dance', 'music', 'drama', 'debate', 'robotics'],
  Sports: ['sports', 'cricket', 'football', 'basketball', 'badminton', 'tournament', 'match', 'athletics', 'ground'],
  Event: ['fest', 'hackathon', 'workshop', 'seminar', 'webinar', 'inauguration', 'conference', 'session', 'symposium', 'talk'],
  Holiday: ['holiday', 'vacation', 'off', 'closed', 'diwali', 'holi', 'eid', 'christmas', 'republic day'],
  Academic: ['class', 'lecture', 'syllabus', 'tutorial', 'attendance', 'prof', 'professor', 'hod', 'course'],
  Other: []
};

const DEPT_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /\b(cse|computer\s*science)\b/i, name: 'Computer Science & Engineering' },
  { pattern: /\b(it|information\s*technology)\b/i, name: 'Information Technology' },
  { pattern: /\b(ece|electronics|e&c)\b/i, name: 'Electronics & Communication' },
  { pattern: /\b(eee|electrical)\b/i, name: 'Electrical & Electronics' },
  { pattern: /\b(mech|mechanical)\b/i, name: 'Mechanical Engineering' },
  { pattern: /\b(civil)\b/i, name: 'Civil Engineering' },
  { pattern: /\b(biotech|biotechnology)\b/i, name: 'Biotechnology' },
  { pattern: /\b(mba|bba|management)\b/i, name: 'Business Administration (MBA/BBA)' }
];

function detectCategory(text: string): Category {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as Array<[Category, string[]]>) {
    if (cat === 'Other') continue;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return cat;
      }
    }
  }
  return 'Other';
}

function detectAudience(text: string): { department: string | null; year: number | null } {
  let department: string | null = null;
  let year: number | null = null;

  for (const { pattern, name } of DEPT_PATTERNS) {
    if (pattern.test(text)) {
      department = name;
      break;
    }
  }

  // Detect year: "1st year", "2nd yr", "3rd year", "4th year", "year 2", "3rd sem" (year 2), etc.
  const yearMatch = text.match(/\b([1-4])(?:st|nd|rd|th)?\s*(?:year|yr)\b/i) || text.match(/\byear\s*([1-4])\b/i);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  } else {
    const semMatch = text.match(/\b([1-8])(?:st|nd|rd|th)?\s*sem(?:ester)?\b/i);
    if (semMatch) {
      const sem = parseInt(semMatch[1], 10);
      year = Math.min(4, Math.max(1, Math.ceil(sem / 2)));
    }
  }

  return { department, year };
}

function detectVenue(text: string): string | null {
  // 1. Direct match for known college venue names (case insensitive)
  const knownVenueMatch = text.match(/\b(seminar\s+hall(?:\s+[A-Za-z0-9]+)?|auditorium|audi(?:\s+\d+)?|ground|sports\s+complex|oat|open\s+air\s+theatre|library|canteen|lab\s+\d+|room\s+\d+|workshop\s+\d+)\b/i);
  if (knownVenueMatch) {
    const v = knownVenueMatch[1].trim();
    return v.charAt(0).toUpperCase() + v.slice(1);
  }

  // 2. Hinglish post-position: "X mein"
  const meinMatch = text.match(/([A-Za-z0-9\s-]+?)\s+mein\b/i);
  if (meinMatch) {
    const v = meinMatch[1].trim();
    // Exclude common temporal words like "shaam", "dopahar", "subah"
    if (!/^(shaam|dopahar|subah|kal|parso|aaj)$/i.test(v) && v.length > 2 && v.length <= 80) {
      return v.charAt(0).toUpperCase() + v.slice(1);
    }
  }

  // 3. English preposition: "in X", "at X", "venue: X"
  const venueMatch = text.match(/(?:at|in|venue\s*[:-])\s+([A-Za-z0-9\s-]+?)(?=\s+(?:on|at|by|from|for|with|\.|\n|$))/i);
  if (venueMatch) {
    const venue = venueMatch[1].trim();
    if (venue.length > 2 && venue.length <= 80) {
      return venue.charAt(0).toUpperCase() + venue.slice(1);
    }
  }

  return null;
}

function detectLanguage(text: string): string {
  const hinglishWords = ['kal', 'parso', 'aaj', 'baje', 'hai', 'mein', 'hoga', 'hogi', 'sab', 'aao', 'zaroor', 'kripya'];
  const lower = text.toLowerCase();
  let matches = 0;
  for (const w of hinglishWords) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(lower)) {
      matches++;
    }
  }
  if (matches >= 1) return 'Hinglish';
  return 'English';
}

function resolveDateAndTimes(
  text: string,
  referenceDate: Date
): { date: string | null; time: string | null; endTime: string | null } {
  let date: string | null = null;
  let time: string | null = null;
  const endTime: string | null = null;

  const lower = text.toLowerCase();

  // 1. Hinglish date keywords
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  if (/\bparso\b/i.test(lower)) {
    const target = new Date(refYear, refMonth, refDay + 2);
    date = formatDate(target);
  } else if (/\bkal\b/i.test(lower)) {
    const target = new Date(refYear, refMonth, refDay + 1);
    date = formatDate(target);
  } else if (/\baaj\b/i.test(lower)) {
    date = formatDate(referenceDate);
  }

  // 2. Hinglish time words: "5 baje", "10:30 baje"
  const bajeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*baje/i);
  if (bajeMatch) {
    let hour = parseInt(bajeMatch[1], 10);
    const min = bajeMatch[2] ? parseInt(bajeMatch[2], 10) : 0;
    // Context heuristic: college event 1-6 baje without am/pm is almost always PM
    if (hour >= 1 && hour <= 7 && !/am|morning/i.test(lower)) {
      hour += 12;
    }
    time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  // 3. Chrono-node natural language date & time parsing
  const chronoResults = chrono.parse(text, referenceDate);
  if (chronoResults.length > 0) {
    const firstResult = chronoResults[0];
    const startDate = firstResult.start.date();

    if (!date && firstResult.start.isCertain('day')) {
      date = formatDate(startDate);
    }

    if (!time && (firstResult.start.isCertain('hour') || firstResult.start.isCertain('minute'))) {
      const h = String(startDate.getHours()).padStart(2, '0');
      const m = String(startDate.getMinutes()).padStart(2, '0');
      time = `${h}:${m}`;
    }

    if (firstResult.end && (firstResult.end.isCertain('hour') || firstResult.end.isCertain('minute'))) {
      const endDate = firstResult.end.date();
      const eh = String(endDate.getHours()).padStart(2, '0');
      const em = String(endDate.getMinutes()).padStart(2, '0');
      return { date, time, endTime: `${eh}:${em}` };
    }
  }

  // 4. Regex fallback for standard HH:MM (e.g. "14:00", "5:30 PM", "10 AM")
  if (!time) {
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3].toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  return { date, time, endTime };
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateCleanTitle(text: string, category: Category): string {
  // Strip common noisy greetings or WhatsApp noise
  const clean = text
    .replace(/^([*#_=~-]{2,})/gm, '')
    .replace(/(fyi|fwd|forwarded|urgent|notice|announcement)[:\s-]*/i, '')
    .trim();

  const firstLine = clean.split('\n')[0].trim();
  if (firstLine.length > 5 && firstLine.length <= 80) {
    return firstLine;
  }

  // Extract first sensible phrase
  const match = clean.match(/^([^.?!]+)/);
  if (match && match[1].trim().length >= 5) {
    return match[1].trim().slice(0, 80);
  }

  return `${category} Notice`;
}

/**
 * Offline rule-based parser.
 * Handles English and Hinglish notices, extracting title, date, time, venue, category, and audience.
 */
export function parseNoticeOffline(rawText: string, todayStr?: string): ExtractedItem[] {
  const text = rawText.trim();
  if (!text) return [];

  const referenceDate = todayStr ? new Date(`${todayStr}T00:00:00`) : new Date();

  // If text contains multiple separated notices (e.g., delimited by 2+ newlines or "---")
  const sections = text.split(/\n\s*[-=]{3,}\s*\n|\n\s*\n\s*\n/).filter((s) => s.trim().length > 10);
  const notices = sections.length > 1 ? sections : [text];

  const results: ExtractedItem[] = [];

  for (const notice of notices) {
    const category = detectCategory(notice);
    const audience = detectAudience(notice);
    const venue = detectVenue(notice);
    const language = detectLanguage(notice);
    const { date, time, endTime } = resolveDateAndTimes(notice, referenceDate);
    const isDeadline = category === 'Deadline' || /\b(deadline|due\s*date|last\s*date|submit\s*by)\b/i.test(notice);

    const title = generateCleanTitle(notice, category);
    const summary = notice.replace(/\s+/g, ' ').trim().slice(0, 180);

    results.push({
      title,
      date,
      time,
      endTime,
      venue,
      category,
      isDeadline,
      summary: summary || title,
      language,
      audience,
      confidence: 0.8
    });
  }

  return results;
}
