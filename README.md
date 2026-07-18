# LearnLoop

**Problem:** learning tools are built for administrators, not learners. A student finishes a lecture with no practice material. A beginner hits a Python error and burns 40 minutes on old forum threads. A community speaker spends 10 hours prepping a workshop with no scaffolding. Plenty of content exists. What's missing is tooling that turns that content into something usable, right away.

**What this does:** paste a source, get seven study tools generated from it, plus a chatbot for that exact topic. No login, no dashboard.

## Sources supported

| Source | How it's read |
|---|---|
| YouTube link | Pulls the video's caption transcript, no API key needed |
| Blog / article URL | Fetches the page and extracts the main article text |
| PDF | Upload a text-based PDF (up to 10MB) |
| Google Doc URL | Reads the public plain-text export. Doc must be shared as "Anyone with the link can view" |
| Google Sheet URL | Reads the public CSV export of the first tab, same sharing requirement |

## Features generated from any source

1. **Summary** — a short summary plus key points
2. **Voice explanation** — a speaker icon next to every generated block reads it aloud, using the browser's built-in text-to-speech, no extra API or cost
3. **Mind map** — a central topic with branches and sub-points
4. **Flashcards** — front/back cards with a show/hide toggle
5. **Quiz** — multiple choice questions with the correct answer and a one-line explanation
6. **Assignments** — short hands-on practice tasks with a time estimate
7. **Revision notes** — condensed, headed notes for exam prep
8. **Chatbot (Q&A)** — ask anything about the loaded source, answered only from that source

## Requirement Map

| # | Requirement | Where it's satisfied |
|---|---|---|
| 1 | Ingest YouTube, blog, PDF, Google Sheet/Doc | `server/lib/extractors/*`, one file per source |
| 2 | Generate summary, mind map, flashcards, quiz, assignments, revision notes | `server/lib/promptTemplates.js` (one system instruction per feature) + `server/routes/generate.js` |
| 3 | Voice explanation (read aloud) | `public/app.js`, `makeSpeakerButton`, uses the native Web Speech API |
| 4 | Chatbot Q&A for that topic | `server/routes/chat.js`, grounded in the ingested source text, with short-term memory per session |
| 5 | Usable directly by a learner, no admin layer | Single page, paste a link or upload a file, no login |

## Stack

Node.js and Express on the backend, plain HTML/JS on the frontend styled with Tailwind CSS, Gemini (`@google/genai`) for generation. No database. Session state (the ingested text and chat history) is kept in memory, keyed by a session id, with a 2-hour expiry.

**Styling note:** the frontend loads Tailwind via the Play CDN (`cdn.tailwindcss.com`) so there's no build step, which keeps setup to `npm install && npm start`. That CDN script logs a "not for production" warning in the browser console by design. It's the right trade-off for a hackathon demo; for a real deployment, swap it for a compiled Tailwind build (`npx tailwindcss init` and a build step) so styles are bundled instead of compiled in the browser on every load. Each generated study tool (summary, mind map, flashcards, quiz, assignments, revision notes) gets its own accent colour, echoed from its button through to its result card, so the colour itself tells you which tool produced what, like a set of colour-coded index cards.

**Known trade-off:** in-memory sessions mean state is lost on server restart and won't work across multiple server instances behind a load balancer. That's the right trade-off for a hackathon demo. Swapping in Redis later is a small, contained change since all session access already goes through `server/lib/sessionStore.js`.

## Setup and run

```bash
npm install
cp .env.example .env
# put your real GEMINI_API_KEY in .env, from https://aistudio.google.com/apikey
npm start
```

Open `http://localhost:3000`.

## Run tests

```bash
npm test
```

49 tests: input validation edge cases for every route, the SSRF guard (with DNS mocked so tests never touch the real network), the CSV-to-text helper, and route-level tests (400/404/200/500 paths) with the AI client and extractors mocked so tests run free, fast, and without a real API key.

```bash
npm run lint
```

Zero warnings, zero errors.

## Deploying for a live demo

Any Node host works (Render, Railway, Fly.io).

1. Push this repo to GitHub.
2. Create a new web service from the repo.
3. Build command `npm install`, start command `npm start`.
4. Add the `GEMINI_API_KEY` environment variable in the host's dashboard. Never put it in the repo.
5. Set `ALLOWED_ORIGINS` to your deployed URL once you have it.

## Security checklist

- No secret ever committed. `.env` is gitignored, `.env.example` has placeholders only.
- All input validated at the boundary in `server/lib/validate.js`.
- **SSRF guard** (`server/lib/urlSafety.js`): every user-supplied URL the server fetches (blog, Google Doc, Google Sheet, YouTube) is checked before fetching. Blocks non-http(s) protocols, `localhost`, and any hostname that resolves to a private, loopback, or link-local address, including the `169.254.169.254` cloud metadata address. This matters here specifically because this app's whole job is fetching URLs a user gives it.
- Extracted source text is capped at 15,000 characters before it ever reaches the model, and PDF uploads are capped at 10MB, so no oversized input drives up cost or latency.
- Rate limiting on all `/api` routes (15 requests per minute per client).
- `helmet` sets standard security headers. `cors` restricts allowed origins.
- Errors are logged server-side but the client only ever sees a safe, generic message for unexpected failures. Extraction failures (bad URL, private doc, no captions) return their specific, safe message since those are the user's to fix.
- All dynamic content on the frontend renders with `textContent` / `createElement`, never `innerHTML` with interpolated strings, so model output can never inject markup.
- The PDF upload route validates MIME type and caps file size before parsing.

## Efficiency notes

- One model call per feature generation, no loops, no repeated calls.
- Source text is capped once at ingestion, so every downstream feature call works on a bounded amount of text regardless of how long the original source was.
- Session store sweeps expired entries every 10 minutes so memory doesn't grow unbounded over a long-running demo.
- Chat history capped at the last 8 turns per session, so a long conversation doesn't balloon the prompt sent on every turn.

## Accessibility

- Semantic HTML throughout: `fieldset`/`legend` for source and feature choices, a real `label` tied to every input, a skip link, `role="status"`/`role="log"` live regions so screen reader users hear updates as they happen.
- Fully keyboard operable, native form controls, no custom widgets.
- Visible focus outline on every interactive element.
- Colour palette checked for WCAG AA contrast.
- The mind map is rendered as a nested, labelled list rather than a canvas or SVG diagram, specifically so it stays readable and navigable by screen readers and keyboard, not just sighted mouse users.
- Voice explanation doubles as an accessibility feature: any generated block can be read aloud with one tap, no extra setup.

## Judging dimension map

| Dimension | Where |
|---|---|
| Code Quality | `server/lib/*`, one responsibility per module, no duplicated logic |
| Security | See Security checklist above |
| Efficiency | See Efficiency notes above |
| Testing | `tests/*.test.js`, run with `npm test` |
| Accessibility | See Accessibility section above |
| Alignment | See Requirement Map above |

## What's not built, on purpose

Given the build window, this covers all 5 sources and all 7 features at a solid, working depth rather than adding extras like saved history across sessions, user accounts, PDF/export of generated material, or OAuth-based Google Sheets/Docs access for private files. Those are natural next steps once the core loop is proven in the demo.
