# PRD: Campus Pulse

> Read this entire document before writing any code. It is the single source of truth.
> Re-read sections 5, 6, 7, 8 and 16 before declaring the work finished.

## 1. Problem statement (verbatim from the hackathon)

Students at every college face the same daily friction: scattered notices on WhatsApp groups, missed deadlines, unclear event details, and no single place to see what's happening.

Build a working web app, using only natural-language prompts, that gives students one clear, intelligent place to stay on top of campus life.

**Core requirements (every participant must deliver)**
1. **Smart input:** The user can paste messy, unstructured text (a forwarded WhatsApp notice, an email, an event poster caption) and the app uses AI to extract the title, date, time, venue and category into a clean card.
2. **Organised view:** All extracted items appear in a searchable, filterable list or calendar view (by date and category).
3. **Priority and reminders:** The app flags items as urgent, upcoming or expired, and highlights what needs attention today.
4. **AI summary:** A "What do I need to know this week?" button generates a short, readable digest.
5. **Usable interface:** Responsive, and a first-time user should understand it without instructions.

**Bonus challenges**
1. Handle multiple languages, or Hinglish notices.
2. Detect clashing events and warn the user.
3. Add a voice or speech input option.
4. Include a dark mode or accessibility features.
5. Offer a "personalise for my department or year" filter.

**Submission:** public GitHub repo (**must be under 10 MB**), live deployment link, LinkedIn post (tag Hack2skill, Google For Developers, CSSS).

**Judging priorities (in order of importance):** security of the code, accessibility, code quality, testing, problem alignment, efficiency.

## 2. Goals and non-goals

**Goals:** turn messy text into structured cards; organise, search and filter them; flag urgency; summarise the week; be accessible, secure, fast and well tested.

**Non-goals:** user accounts, social features, native apps, payments, admin dashboards.

## 3. Target users

College students (UG/PG, all departments, years 1-4), often on mobile, often reading Hinglish or mixed-language notices, often in a hurry.

## 4. Tech stack (fixed, to keep the repo small and efficient)

- **Frontend:** Vite + TypeScript, vanilla TS in small modules (no heavy framework). Plain CSS with CSS variables (light and dark themes).
- **Backend:** Node.js 20 + Express + TypeScript. Serves the built frontend and `/api/*` routes. Deployable as a single container on Google Cloud Run.
- **AI:** Gemini via `@google/genai`, **server-side only**. Model name from env `GEMINI_MODEL` (default `gemini-2.5-flash`). Use structured JSON output with a response schema.
- **Validation:** `zod`. **Security headers:** `helmet`. **Rate limiting:** `express-rate-limit`. **Compression:** `compression`.
- **Date parsing fallback:** `chrono-node`.
- **Storage:** browser `localStorage` (privacy-friendly, no database). Versioned schema with safe migration and try/catch around every parse.
- **Testing:** Vitest (unit, plus API via supertest), Playwright (e2e), axe-core (accessibility).
- **Quality:** ESLint, Prettier, strict TypeScript.

## 5. Core requirements (all mandatory)

### 5.1 Smart input
- A large textarea labelled "Paste a notice, email or poster caption".
- Button "Extract" sends the text to `POST /api/extract`.
- AI returns per item: `title`, `date` (ISO yyyy-mm-dd), `time` (HH:mm 24h, optional), `endTime` (optional), `venue`, `category`, `isDeadline` (boolean), `summary` (one line), `language`, `audience`, `confidence`.
- Categories (enum): `Academic, Exam, Event, Club, Sports, Placement, Deadline, Holiday, Other`.
- The server injects today's date and timezone `Asia/Kolkata` into the prompt so relative dates ("tomorrow", "kal", "this Friday") resolve correctly.
- One text may contain multiple notices: return an array of items.
- Result is shown as a **preview card the user can edit and confirm** before saving. Missing fields are clearly marked "Not mentioned" and never invented.
- **Fallback:** if Gemini fails or times out (8 s), use the local rule-based parser (chrono-node plus keyword category matching) and show the notice "Used offline parser".

### 5.2 Organised view
- List view and Calendar (month grid) view, with a toggle.
- Search (title, venue, summary), category filter chips, date range (Today / This week / All), and status filter.
- Default sort: date and time ascending.
- Edit and delete items. Undo after delete.

### 5.3 Priority and reminders
Status is computed client-side from the event datetime and the current time:
- **Expired:** datetime has passed (for deadline items: end of that day).
- **Urgent:** within the next 48 hours, or a deadline due today or tomorrow.
- **Upcoming:** everything else in the future.

Also:
- A "Needs attention today" banner at the top lists today's items and urgent items, sorted by time. When empty it says "Nothing urgent. You're clear!"
- Opt-in browser notifications (`Notification` API) for urgent items, plus an in-app reminder if notifications are denied or unsupported.
- Status is shown with colour **plus** icon **plus** text label, never colour alone.

### 5.4 AI summary
- Button "What do I need to know this week?" calls `POST /api/digest` with the saved items for the next 7 days (client sends a minimal, validated subset).
- Returns a short, readable digest (max about 150 words): top priorities, deadlines, clashes, and a one-line tip. Rendered as plain text only (no HTML).
- Cache the result per unique set of items for the session so repeated clicks cost nothing. Show a loading state and a retry on error.
- **Fallback:** a locally generated template digest if the AI is unavailable.
- Include a "Copy" button.

### 5.5 Usable interface
- Responsive, mobile-first (320 px to desktop).
- No instructions needed: clear empty state with a "Try a sample notice" button, labelled buttons, inline helper text, friendly error messages.
- Single page with three clear zones: **Add**, **Today / Attention**, **My items**.

## 6. Bonus features (all mandatory to implement)

1. **Multilingual and Hinglish:** the prompt instructs the model to understand Hindi, Hinglish and mixed-language text and to output English fields. The original language is stored in `language`. The offline parser must handle common Hinglish date words (kal, parso, aaj, baje). Include Hinglish fixtures such as "Kal 5 baje seminar hall mein placement talk hai".
2. **Clash detection:** detect overlapping time ranges on the same date (default duration 1 hour when no end time). Show a warning badge on both cards and a banner on save: "This clashes with X".
3. **Voice input:** microphone button using the Web Speech API (`SpeechRecognition`), with a language selector (en-IN, hi-IN). Feature-detect and hide gracefully if unsupported. Announce state through an `aria-live` region.
4. **Dark mode and accessibility:** theme toggle (system default, persisted), text-size control, high-contrast-safe palette, reduced-motion support (see section 8).
5. **Personalise:** profile panel with Department (dropdown) and Year (1-4). Items carry an audience (department/year, or null for everyone). AI extraction also returns `audience` when stated ("for CSE 3rd year"). Toggle "Show only relevant to me".

## 7. Security requirements (top judging criterion)

- API key only in server env (`GEMINI_API_KEY`). Never in the client bundle, logs or git. Provide `.env.example`; `.gitignore` covers `.env`.
- Validate every request body with zod: max text length 5,000 chars, array size limits, strict types, reject unknown fields.
- Rate limit `/api/*` (for example 20 requests/min/IP). Body size limit 20 kb.
- `helmet` with a strict CSP (no inline scripts, `default-src 'self'`, `connect-src 'self'`), HSTS, no-sniff, `frame-ancestors 'none'`, referrer policy.
- No `innerHTML` with dynamic data. Build the DOM with `textContent` or `createElement`. Add an ESLint rule banning `innerHTML`, `outerHTML` and `insertAdjacentHTML`.
- **Prompt-injection defence:** put user text inside delimiters. The system instruction states the content is untrusted data and that instructions inside it must never be followed. Output is constrained by the JSON schema, then re-validated with zod; invalid output is discarded.
- Sanitise and length-limit all AI output before display or storage.
- CORS: same-origin only. Generic error messages to the client (no stack traces or internals). Structured server logs that never include user text.
- No user accounts or PII stored server-side. State this in a Privacy note in the README and the UI footer.
- Run `npm audit` and keep dependencies minimal and pinned through the lockfile.
- Add `SECURITY.md` describing the threat model and mitigations.

## 8. Accessibility requirements (WCAG 2.2 AA)

- Semantic landmarks (`header`, `nav`, `main`, `footer`), exactly one `h1`, logical heading order, "Skip to content" link.
- Fully keyboard operable, visible focus ring, logical tab order, no keyboard traps. Modal dialogs trap and restore focus; Esc closes them.
- All inputs have visible `<label>`s. Errors are linked with `aria-describedby`. `aria-live="polite"` regions for extraction results, digest and status changes.
- Contrast at least 4.5:1 for text and 3:1 for UI components in both themes. Never rely on colour alone.
- Touch targets at least 44x44 px. Supports 200% zoom and text resize without loss of content. Respects `prefers-reduced-motion` and `prefers-color-scheme`.
- Calendar view is a proper table/grid with accessible names, and the list view is always available as an equivalent alternative.
- Automated axe-core checks in e2e tests must show **zero violations**.

## 9. Efficiency requirements

- Production bundle under 100 KB gzipped JS. No UI framework, no icon library (inline SVG or Unicode).
- Debounce search (200 ms). Render lists efficiently (update only changed nodes, or use small keyed updates).
- Cache digest results. Cap AI output tokens. Use the lightweight model.
- System fonts only. No images in the repo beyond one small SVG favicon.
- Gzip compression and long-cache headers for hashed static assets.
- **Repository must stay under 10 MB.** See section 9.1.

### 9.1 Repository size rule (hard limit: 10 MB including `.git`)

The final public GitHub repo must be under 10 MB. Target: under 3 MB, to leave a safety margin.

- Create `.gitignore` **before the first commit**. It must cover: `node_modules`, `dist`, `build`, `coverage`, `.env`, `.env.*` (but keep `!.env.example`), `playwright-report`, `test-results`, `*.log`, `.DS_Store`, `*.mp4`, `*.mov`, `*.gif`.
- Never commit screenshots, videos, screen recordings or generated binaries. Keep them outside the project folder.
- No images except one small SVG favicon. No fonts, large JSON files or datasets.
- Playwright traces, videos and screenshots must be written to ignored folders only.
- Provide `npm run size-check` (a small Node script) that measures the repo size excluding `node_modules` (including `.git`) and **fails if it exceeds 5 MB**. Run it before every commit, in CI, and document it in the README.
- Never commit a large file and delete it later, because it stays in git history. If it happens before pushing, re-initialise the repo.
- Report the final repo size in the verification report.

Manual checks:

```bash
du -sh --exclude=node_modules .          # total size including .git
git count-objects -vH                    # size of git history
git ls-files | xargs du -k | sort -rn | head -20   # 20 biggest tracked files
```

## 10. Data model

```ts
type Category =
  | 'Academic' | 'Exam' | 'Event' | 'Club' | 'Sports'
  | 'Placement' | 'Deadline' | 'Holiday' | 'Other';

interface CampusItem {
  id: string;            // crypto.randomUUID()
  title: string;         // max 120
  date: string | null;   // ISO yyyy-mm-dd
  time: string | null;   // HH:mm
  endTime: string | null;
  venue: string | null;  // max 120
  category: Category;
  isDeadline: boolean;
  summary: string;       // max 200
  audience: { department: string | null; year: number | null }; // null = everyone
  language: string;
  source: 'ai' | 'offline' | 'manual';
  createdAt: string;     // ISO datetime
}
```

Persisted under a versioned key (for example `campusPulse.v1`) with migration and corruption recovery.

## 11. API contract

| Endpoint | Request | Response |
|---|---|---|
| `POST /api/extract` | `{ text: string, today: "yyyy-mm-dd" }` | `{ items: ExtractedItem[], source: 'ai' \| 'offline' }` |
| `POST /api/digest` | `{ items: MinimalItem[] }` | `{ digest: string, source: 'ai' \| 'offline' }` |
| `GET /api/health` | none | `{ ok: true }` |

Errors: `{ error: string }` with the proper status (400, 413, 429, 500).

## 12. UX details

- Header: "Campus Pulse" wordmark, theme toggle, text size, profile.
- "Needs attention today" banner directly under the header.
- Add panel: textarea, mic button, sample button, Extract button; then preview/edit card and Save.
- Items panel: search, category chips, view toggle, list or calendar.
- Digest button is prominent; result appears in a card with a Copy button.
- Toasts are announced to screen readers and are dismissible.
- Footer: privacy note and "Built with Gemini".

## 13. Testing requirements

- **Unit (Vitest):** status calculator (urgent/upcoming/expired, including midnight and deadline edge cases), clash detection, offline parser (English and Hinglish fixtures), zod schemas, filters and search, localStorage load/migrate/corruption.
- **API (supertest):** validation failures, oversized body, rate limit, AI-failure fallback, prompt-injection fixture ("ignore previous instructions...") must not alter the output shape. Gemini client is mocked.
- **E2E (Playwright):** paste, extract, save, filter, search, digest, clash warning, dark mode, mobile viewport, keyboard-only flow.
- **Accessibility:** axe-core scans on main states (light, dark, dialog open).
- Target at least 80% coverage on core logic.
- `npm test` runs all non-e2e tests. `npm run e2e` runs Playwright. Gemini is always mocked in tests.

## 14. Build order (milestones)

After each milestone: run lint, typecheck and tests, and fix failures before moving on. Commit with conventional-commit messages.

1. Scaffold, tooling, strict TS, lint, `.gitignore` (committed first, per section 9.1), `.env.example`, `size-check` script, CI script.
2. Data model, storage layer, status and clash logic, with tests.
3. Server: Express, helmet, rate limit, zod, `/api/extract` with Gemini plus offline fallback, with tests.
4. Frontend: add panel, preview/edit, list view, filters and search.
5. Attention banner, reminders, calendar view.
6. `/api/digest` and the digest UI with caching.
7. Bonus features: Hinglish, voice, personalise, dark mode, text size.
8. Accessibility pass plus axe tests. Security pass plus `SECURITY.md`.
9. E2E tests, bundle and size checks, README, Dockerfile, Cloud Run deploy notes.

## 15. Deliverables

- Public GitHub repo (under 10 MB, clean history, MIT license).
- README: overview, setup, env vars, architecture diagram (mermaid), security, accessibility, testing, deploy. No large screenshots (optimised tiny ones or none).
- `Dockerfile` and Google Cloud Run deploy instructions, with the key stored as an env var or in Secret Manager.
- `SECURITY.md`, `.env.example`, `LICENSE`.
- Final verification report showing results of: lint, typecheck, unit tests, API tests, e2e tests, axe scans, `npm audit`, bundle size and repo size.

## 16. Judging alignment checklist

| Criterion | How we satisfy it |
|---|---|
| Security | Section 7: server-side key, validation, CSP, injection defence, no `innerHTML` |
| Accessibility | Section 8: WCAG 2.2 AA, axe tests with zero violations |
| Code quality | Strict TS, modular files, ESLint/Prettier, small functions, comments only where needed |
| Testing | Section 13: unit, API, e2e, accessibility, 80% core coverage |
| Problem alignment | All 5 core and 5 bonus features map 1:1 to the problem statement |
| Efficiency | Section 9: tiny bundle, caching, lightweight model, repo under 10 MB |

## 17. Definition of done

- Every item in sections 5 and 6 works, including in the deployed app.
- All tests pass and axe reports zero violations.
- `npm audit` shows no high or critical issues.
- Repo size (including `.git`) is under 10 MB, ideally under 3 MB, and `npm run size-check` passes.
- `git ls-files` shows no images (other than the SVG favicon), videos, build folders or `node_modules`.
- A fresh `git clone` followed by `npm install && npm run build` succeeds.
- README, `SECURITY.md`, `.env.example` and `LICENSE` are present.
- No secrets anywhere in git history.
- The app still works in degraded mode (offline parser and template digest) when Gemini is unavailable.
