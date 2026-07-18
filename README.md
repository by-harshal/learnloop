# LearnLoop

**LearnLoop is a zero-friction web application that instantly converts any educational source—like a YouTube video, PDF, or article—into interactive, highly usable practice material. No accounts, no dashboards, just instant active learning.**

## The Problem
Right now, most educational platforms are built for administrators, not the actual learners. You finish a lecture or find a great article, but you have no way to actively practice the material. A student finishes a lecture with no practice material. A beginner hits a Python error and burns 40 minutes on old forum threads. A community speaker spends 10 hours prepping a workshop with no scaffolding. Plenty of content exists. What's missing is tooling that turns that passive content into something usable, right away.

## The Solution
LearnLoop fixes that. You just paste a YouTube link, upload a PDF, or drop an article URL, and instantly—with no login required—it generates eight different study tools and a custom chatbot tailored exactly to that topic. It turns passive content into active, usable practice material in seconds.

## Supported Sources

| Source | How it's read |
|---|---|
| **YouTube link** | Pulls the video's caption transcript, no API key needed |
| **Blog / article URL** | Fetches the page and extracts the main article text |
| **PDF** | Upload a text-based PDF (up to 10MB) |
| **Google Doc URL** | Reads the public plain-text export. Doc must be shared as "Anyone with the link can view" |
| **Google Sheet URL** | Reads the public CSV export of the first tab, same sharing requirement |

## Features Generated
Once a source is loaded, LearnLoop can instantly generate the following study tools:

1. **Summary** — A concise summary plus key bullet points
2. **Mind Map** — A central topic broken down into branches and sub-points
3. **Flashcards** — Interactive front/back cards with a show/hide toggle
4. **Quiz** — Multiple choice questions with the correct answer and a one-line explanation
5. **Assignments** — Short hands-on practice tasks with a time estimate
6. **Revision Notes** — Condensed, headed notes perfect for exam prep
7. **Explainer Video** — Generates a script and visual cues for an explainer video
8. **Infographic** — A structured visual representation of key statistics and concepts
9. **Chatbot (Q&A)** — Ask anything about the loaded source, answered *only* from that source
10. **Voice Explanation** — A speaker icon next to every generated block reads it aloud using the browser's built-in text-to-speech, requiring no extra API cost.

## Built With

LearnLoop was built using a lightweight and fast tech stack:
- **Backend:** Node.js, Express.js
- **Frontend:** Vanilla JavaScript, HTML5, CSS3, Tailwind CSS
- **AI Integration:** Google Gemini API (`@google/genai`)
- **Parsers:** Mozilla Readability (articles), `pdf-parse` (PDFs), `youtube-transcript` (videos)
- **Other:** Web Speech API (text-to-speech)

## Architecture & Trade-offs

- **Memory Sessions:** Session state (the ingested text and chat history) is kept in memory, keyed by a session ID, with a 2-hour expiry. This means state is lost on server restart, which is a perfect trade-off for a fast hackathon demo. For production, swapping in Redis is a small, contained change since all session access goes through `server/lib/sessionStore.js`.
- **Styling:** The frontend loads Tailwind via the Play CDN (`cdn.tailwindcss.com`) so there's no build step, which keeps setup to `npm install && npm start`. For a real deployment, swap it for a compiled Tailwind build.
- **Visual Design:** Each generated study tool gets its own accent color, echoed from its button through to its result card, so the color itself tells you which tool produced what, like a set of color-coded index cards.

## Setup and Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env

# 3. Add your Gemini API Key
# Open .env and add your GEMINI_API_KEY from https://aistudio.google.com/apikey

# 4. Start the server
npm start
```
Open `http://localhost:3000` in your browser.

## Testing & Quality

Run the test suite:
```bash
npm test
```
*Includes 49 tests: input validation edge cases for every route, SSRF guards, the CSV-to-text helper, and route-level tests with the AI client and extractors mocked.*

Run the linter:
```bash
npm run lint
```
*Zero warnings, zero errors.*

## Security Checklist

- **No Secrets Committed:** `.env` is gitignored.
- **Input Validation:** All input validated at the boundary in `server/lib/validate.js`.
- **SSRF Guard:** Every user-supplied URL the server fetches is checked before fetching, blocking non-http(s) protocols, `localhost`, and any private/loopback addresses.
- **Bounded Inputs:** Extracted source text is capped at 15,000 characters before it reaches the model, and PDF uploads are capped at 10MB.
- **Rate Limiting:** All `/api` routes are rate-limited to prevent abuse.
- **XSS Safety:** All dynamic content on the frontend renders with `textContent` / `createElement`, never `innerHTML`.

## Efficiency Notes

- **Single Model Call:** One model call per feature generation, no loops, no repeated calls.
- **Bounded Prompting:** Source text is capped once at ingestion, so every downstream feature call works on a bounded amount of text.
- **Memory Management:** Session store sweeps expired entries every 10 minutes.
- **Chat History Limits:** Chat history is capped at the last 8 turns per session to prevent ballooning context sizes.
