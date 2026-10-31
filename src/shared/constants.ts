import { Category } from './types.ts';

export const CATEGORIES: readonly Category[] = [
  'Academic',
  'Exam',
  'Event',
  'Club',
  'Sports',
  'Placement',
  'Deadline',
  'Holiday',
  'Other'
] as const;

export const DEPARTMENTS: readonly string[] = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Biotechnology',
  'Business Administration (MBA/BBA)',
  'Other Department'
] as const;

export const YEARS: readonly number[] = [1, 2, 3, 4] as const;

export const STORAGE_KEY_ITEMS = 'campusPulse.v1';
export const STORAGE_KEY_PROFILE = 'campusPulse.profile.v1';
export const STORAGE_KEY_THEME = 'campusPulse.theme.v1';
export const STORAGE_KEY_TEXT_SIZE = 'campusPulse.textSize.v1';

export const TIMEZONE = 'Asia/Kolkata';
