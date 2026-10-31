# SECURITY.md — Campus Pulse

## Threat Model & Security Controls

Campus Pulse is a hackathon-grade single-page application serving **campus students only**. The security posture prioritises the judging criteria: **no secrets in-repo, no XSS, no injection, strong server-side validation**.

---

## 1. API Key Isolation

| Threat | Control |
|--------|---------|
| Gemini API key exposed in client bundle | Key is read **only** from server-side environment variable (`GEMINI_API_KEY`). Vite never processes server source files. |
| Key committed to repository | `.gitignore` excludes all `.env` files. Only `.env.example` (no real value) is tracked. |
| Key visible in server logs | `src/server/config.ts` validates key presence but never logs the value. Error handler strips it from responses. |

## 2. Prompt Injection Defence

All user-provided text is wrapped in `<<<USER_UNTRUSTED_CONTENT>>>` delimiters before being sent to Gemini. The system instruction explicitly instructs the model to treat content between those delimiters as data—not instructions. Additionally:

- The Gemini response is **re-validated** by Zod schemas before use (`src/server/schemas/api.ts`).
- Fields that fail schema validation fall back to offline-parsed values, not raw AI output.
- No AI-generated string is ever inserted into the DOM via `innerHTML`, `outerHTML`, or `insertAdjacentHTML` (enforced by ESLint rule).

## 3. Cross-Site Scripting (XSS) Prevention

- **Zero `innerHTML`/`outerHTML`/`insertAdjacentHTML`** with user or AI content — ESLint custom rule catches any introduced at development time.
- All DOM construction uses `document.createElement()`, `textContent`, `setAttribute()`, and the safe `el()` / `text()` helpers in `src/client/utils/dom.ts`.
- **Content Security Policy** (via `helmet`) restricts script sources to `'self'` only. No inline scripts (Vite injects a nonce-compatible hash at build time). No `'unsafe-eval'`.

## 4. HTTP Security Headers

Configured in `src/server/middleware/security.ts` via `helmet`:

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Permissions-Policy` | Restricts camera, microphone, geolocation |

## 5. Rate Limiting

`express-rate-limit` is configured at 20 requests per minute per IP on all `/api/*` routes (`src/server/middleware/security.ts`). This protects against:
- API key abuse via the server proxy
- Denial-of-service via the extraction endpoint

## 6. Input Validation

All incoming API requests are parsed and validated with **Zod** schemas before reaching any business logic:

- `ExtractRequest`: `rawText` must be a non-empty string, max 5000 characters.
- `DigestRequest`: `items` must be a non-empty array of minimal valid `CampusItem` records.
- Schema validation errors return HTTP 400 with a generic "Invalid request" message — never the full Zod error tree (which could leak schema details).

## 7. Request Body Limits

Express is configured with a `20 KB` JSON body limit (`src/server/app.ts`) to prevent memory exhaustion from large payloads.

## 8. Privacy

- **No PII is stored server-side.** All events, profile settings, and preferences live exclusively in the browser's `localStorage`.
- The server only receives the raw text pasted by the user for the duration of an extraction or digest request — it is not logged, stored, or associated with any identity.
- No cookies, no sessions, no authentication tokens.

## 9. Dependency Security

Run `npm audit` before deployment. Current status:

- **0 high/critical** vulnerabilities in production dependencies.
- A small number of moderate-severity findings exist in **dev-only** tools (eslint internals, vitest mocker). These do not ship to production.

## 10. Offline Fallback Security

If the Gemini API is unavailable, the server falls back to a local rule-based parser (`src/server/services/offlineParser.ts`). This fallback:
- Runs entirely server-side.
- Produces the same Zod-validated output shape.
- Never calls external services or exposes API credentials.

## Reporting a Vulnerability

This is a hackathon prototype. For educational purposes only. If you find a genuine security issue, please open a GitHub Issue marked **[SECURITY]**.

