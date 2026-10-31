import { z } from 'zod';

export const CategoryEnum = z.enum([
  'Academic',
  'Exam',
  'Event',
  'Club',
  'Sports',
  'Placement',
  'Deadline',
  'Holiday',
  'Other'
]);

export const AudienceSchema = z
  .object({
    department: z.string().max(120).nullable(),
    year: z.number().int().min(1).max(4).nullable()
  })
  .strict();

export const ExtractedItemSchema = z
  .object({
    title: z.string().min(1).max(120),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable(),
    endTime: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .nullable(),
    venue: z.string().max(120).nullable(),
    category: CategoryEnum,
    isDeadline: z.boolean(),
    summary: z.string().max(200),
    language: z.string().max(50),
    audience: AudienceSchema,
    confidence: z.number().min(0).max(1)
  })
  .strict();

export type ExtractedItem = z.infer<typeof ExtractedItemSchema>;

export const ExtractRequestSchema = z
  .object({
    text: z.string().min(1, 'Text cannot be empty').max(5000, 'Text exceeds 5,000 character limit'),
    today: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
  })
  .strict();

export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;

export const ExtractResponseSchema = z.object({
  items: z.array(ExtractedItemSchema).max(20),
  source: z.enum(['ai', 'offline'])
});

export type ExtractResponse = z.infer<typeof ExtractResponseSchema>;

export const MinimalItemSchema = z
  .object({
    title: z.string().max(120),
    date: z.string().nullable(),
    time: z.string().nullable(),
    venue: z.string().nullable(),
    category: CategoryEnum,
    isDeadline: z.boolean(),
    summary: z.string().max(200)
  })
  .strict();

export const DigestRequestSchema = z
  .object({
    items: z.array(MinimalItemSchema).max(50)
  })
  .strict();

export type DigestRequest = z.infer<typeof DigestRequestSchema>;

export const DigestResponseSchema = z.object({
  digest: z.string().max(1200),
  source: z.enum(['ai', 'offline'])
});

export type DigestResponse = z.infer<typeof DigestResponseSchema>;
