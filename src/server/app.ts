import express, { Express } from 'express';
import compression from 'compression';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { securityHeaders, apiRateLimiter } from './middleware/security.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { extractRouter } from './routes/extract.ts';
import { digestRouter } from './routes/digest.ts';
import { healthRouter } from './routes/health.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  // 1. Security Headers via Helmet (Strict CSP, HSTS, no-sniff, etc.)
  app.use(securityHeaders);

  // 2. Gzip / Deflate compression
  app.use(compression());

  // 3. Strict 20 KB body limit
  app.use(express.json({ limit: '20kb' }));

  // 4. Rate Limiting on API endpoints
  app.use('/api', apiRateLimiter);

  // 5. API Routes
  app.use('/api/health', healthRouter);
  app.use('/api/extract', extractRouter);
  app.use('/api/digest', digestRouter);

  // 6. Static files serving with cache headers for production
  const clientDist = path.resolve(__dirname, '../../dist/client');
  if (fs.existsSync(clientDist)) {
    app.use(
      express.static(clientDist, {
        maxAge: '1y',
        immutable: true,
        index: false
      })
    );

    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // 7. Error handling middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
