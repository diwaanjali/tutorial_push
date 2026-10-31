import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/app.ts';

const app = createApp();

describe('API Security, Headers & Rate Limiting', () => {
  it('includes strict security headers on all responses', async () => {
    const res = await request(app).get('/api/health');

    // CSP headers
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['content-security-policy']).toContain("frame-ancestors 'none'");

    // X-Content-Type-Options
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    // Strict-Transport-Security
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('provides rate limit headers on /api requests', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });

  it('POST /api/digest validates payload and returns template digest in offline mode', async () => {
    const payload = {
      items: [
        {
          title: 'Project Submission',
          date: '2026-11-04',
          time: '23:59',
          venue: null,
          category: 'Deadline',
          isDeadline: true,
          summary: 'Submit final report on portal'
        }
      ]
    };

    const res = await request(app)
      .post('/api/digest')
      .send(payload)
      .expect(200);

    expect(res.body.digest).toBeDefined();
    expect(res.body.digest).toContain('Project Submission');
    expect(res.body.source).toBeDefined();
  });

  it('POST /api/digest rejects malformed items with 400', async () => {
    const res = await request(app)
      .post('/api/digest')
      .send({ items: [{ invalid: 'item' }] })
      .expect(400);

    expect(res.body.error).toBeDefined();
  });
});

