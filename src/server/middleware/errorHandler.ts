import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error & { status?: number; type?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Check for body-parser entity too large (payload > 20kb)
  if (err.type === 'entity.too.large' || err.status === 413) {
    res.status(413).json({ error: 'Payload too large. Maximum request size is 20 KB.' });
    return;
  }

  // Syntax error from malformed JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Malformed JSON payload.' });
    return;
  }

  // Log error message securely without logging sensitive user input
  console.error(`[API Error] ${err.name}: ${err.message}`);

  const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status).json({
    error: status === 500 ? 'An unexpected server error occurred.' : err.message
  });
}
