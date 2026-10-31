import { Router, Request, Response, NextFunction } from 'express';
import { ExtractRequestSchema } from '../schemas/api.ts';
import { extractCampusNotice } from '../services/gemini.ts';

export const extractRouter = Router();

function getTodayKolkataISO(): string {
  const now = new Date();
  // Formats in Asia/Kolkata timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now);
}

extractRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = ExtractRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      res.status(400).json({ error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid request payload' });
      return;
    }

    const { text, today } = parseResult.data;
    const effectiveToday = today || getTodayKolkataISO();

    const response = await extractCampusNotice(text, effectiveToday);
    res.json(response);
  } catch (err) {
    next(err);
  }
});
