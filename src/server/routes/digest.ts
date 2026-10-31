import { Router, Request, Response, NextFunction } from 'express';
import { DigestRequestSchema } from '../schemas/api.ts';
import { generateWeeklyDigest } from '../services/gemini.ts';

export const digestRouter = Router();

digestRouter.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = DigestRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      res.status(400).json({ error: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid request payload' });
      return;
    }

    const { items } = parseResult.data;
    const response = await generateWeeklyDigest(items);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

