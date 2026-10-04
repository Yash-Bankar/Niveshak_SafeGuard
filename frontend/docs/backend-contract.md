# Backend contract (the live one)

Source of truth for what the **deployed** FastAPI LLM backend actually
implements. It supersedes PRD B5 where they differ (see the pointer at the top
of B5). Updated Phase 11 (2026-10-04) from the backend's live Swagger UI
("backend v2" API), pasted by the backend owner.

- Host: `LLM_BACKEND_URL` (server-only, set in `.env.local`; backend runs on a
  separate machine).
- Auth: the README documents no auth header, but we **always send
  `X-API-Key: LLM_BACKEND_API_KEY`** — harmless today, ready if the backend
  adds the check later.
- Language: the model is **multilingual by prompt** — the backend now also has
  `POST /language { session_id, language }`, but we do not call it (we send a
  `language` field on each request — FastAPI ignores unknown body fields — and
  prepend a one-line "(Reply in …)" instruction so replies come back in the
  UI locale). `GET /languages` is likewise unused.
- **Never render backend strings in our UI.** The quiz welcome `message`
  contains another brand name ("BharatFinanceEdu"), `feedback` says "Trade
  responsibly", and the scan's own `verdict` prose may contain words we never
  render (e.g. "scam") — we always use our own translated copy or a recomputed
  verdict.

## Backend v2 endpoints (all of them)

| Endpoint | Used by us? | Notes |
| --- | --- | --- |
| `GET /` | no | health check |
| `POST /chat` | **yes** — assistant | replaces the old `POST /assistant` |
| `GET /chat/history/{session_id}` | no | history ownership stays in our Postgres (`chat_messages`) per PRD B5 |
| `GET /languages`, `POST /language` | no | language is sent per-request instead (see above) |
| `POST /quiz/generate` | **yes** — safety-quiz start | replaces the old `POST /quiz` |
| `POST /quiz/submit` | **yes** — safety-quiz submit | unchanged path |
| `GET /quiz/voice/{session_id}/{index}` | no | per-question `voice_url` we ignore; quiz narration uses `/voice/speak` instead (Phase 13) |
| `POST /analyze-fomo` | no | our FOMO score is deterministic and local (locked decision) |
| `GET /market-alerts` | no | market data runs inside Next.js (B5) |
| `POST /scan-image` | **yes** — fraud scan | replaces our in-Next.js OCR + detector |
| `POST /voice/speak` | **yes** — TTS | returns **raw `audio/mpeg` bytes** (verified live; the OpenAPI `schema: {}` is wrong). Chat reply read-aloud + quiz question narration. |
| `POST /voice/listen` | **yes** — STT | multipart `{session_id, audio}` → `{transcript, language, reply, reply_audio_base64}`. We use only `transcript` — our chat pipeline answers. |

There is **no supported-stock list endpoint anymore** (the old `GET /quiz` is
gone) — the chips on the unsupported-stock card come from the static table
(`FALLBACK_QUIZ_STOCKS` in `lib/safety.ts`).

## What we call

### `POST /chat`

Request (extras undeclared in the schema, ignored unless the backend opts in):

```json
{ "message": "…", "session_id": "<sg_vid>", "chat_history": [{ "role": "user", "content": "…" }], "language": "en|hi|mr" }
```

Response: `{ "reply": string, "rag_sources_used": boolean, "live_data_used": boolean }`
(normalized by `assistantResponseSchema`).

### `POST /quiz/generate` / `POST /quiz/submit`

Request: `{ session_id, target_stock }` (start) and
`{ session_id, answers: [{ question_index, selected_option }] }` (submit).
The start response is **untyped in OpenAPI** (`schema: {}`) but was verified
live during Phase 11 and has this shape — the questions live in a top-level
`quiz` **array**:

```json
{
  "session_id": "…", "ticker": "RELIANCE.NS", "beta": 1, "language": "en",
  "quiz": [
    { "question": "…", "options": { "A": "…", "B": "…", "C": "…", "D": "…" },
      "voice_url": "/quiz/voice/…/0" }
  ]
}
```

`normalizeQuizStart` reads that `quiz` array (and still accepts a top-level
`questions` array or a `{ quiz: { questions } }` / `data` / `result` wrapper);
`normalizeQuizSubmit` reads the untyped submit body. Question and option text
often carries LaTeX math (`$\leq$ 1%`, `$> $1$\%$`) — it is converted to
readable Unicode by `cleanMathText` (`src/lib/backend/cleanText.ts`) so we
never render raw math markup. We ignore `beta`, `language`, `voice_url` and
the backend's `feedback` prose. We additionally
send `language`, `tip_source`, `scan_summary`, `fomo_score`, `fomo_band`,
`quiz_id` as undeclared extras (ignored unless the backend opts in). Quizzes
are keyed by `session_id` (= our `sg_vid`); there is no `quiz_id` in the live
response. `404 { detail: "Quiz session not found." }` on submit → we surface
`quiz_expired`. The backend may return fewer than 5 questions — the UI renders
`questions.length`.

### `POST /scan-image` (the fraud scan)

- Request: `multipart/form-data` with a single `file` field (our screenshot).
- Response: an **untyped** body (`schema: {}` in the live Swagger — the
  endpoint returns a plain dict). During the Phase-11 update the backend was
  unreachable, so the exact field names could not be probed; our proxy
  therefore normalizes defensively in `src/lib/scan/normalize.ts`, accepting
  any of: a verdict string ("not a scam"), a scam boolean (`{ is_scam }`),
  the Python detector report (`is_registered` / `red_flags_found` /
  `risk_score` / `verdict`), a structured flag list (`red_flags: [...]`), or
  one level of `{ data | result | report }` nesting. **Re-verify with one
  Swagger "Try it out" probe when the backend is online and tighten
  `normalize.ts` if it returns a shape we don't cover** (it currently falls
  back to HTTP 502 `scan_failed`, shown as "scan unavailable").
- The backend's own `verdict` prose is **never** forwarded to the browser —
  we recompute verdict + risk level with the Python-parity matrix
  (`verdictFrom` in `lib/scan/detector.ts`) and render our translated
  templates (always "red flags / warning signs", never "scam").
- Our `/api/fraud-scan` route keeps: visitor guard, dual rate limits
  (6/10 min), 4 MB limit, magic-byte sniff, and returns only the scan result
  (flag titles, risk level, score, registration numbers) — never OCR text.
- Errors we map: upstream failure/unknown body → `502 scan_failed`;
  backend "couldn't read" signal → `503 ocr_unavailable`; our forwarding
  timeout (100 s) → `504 timeout`; plus the route's own 400/413/415/429.
- With `USE_MOCK_BACKEND="true"` the route skips the backend and returns a
  fixed high-risk demo result (2 flags) so the flow works offline.

Error shapes seen live (older probing): `422` FastAPI validation
(`{detail: [{loc, msg}]}`), `503 { detail: "AI Server is currently
unreachable." }` when the backend's LLM is down (mapped by us to our generic
`upstream` → HTTP 502).

### `POST /voice/speak` / `POST /voice/listen` (Phase 13)

- `POST /voice/speak` `{ session_id, text }` → **raw `audio/mpeg` bytes** (we
  verified this live; the Swagger response schema is `{}` and the example
  `"string"` is misleading). Our `/api/voice/speak` proxy adds the visitor id
  as `session_id`, forwards with the API key, and **streams the audio back**
  to the browser — the backend URL/key never reach the client. A defensive
  JSON path (base64 in `audio_base64` / `reply_audio_base64`) is also handled.
- `POST /voice/listen` multipart `{ session_id, audio }` →
  `{ transcript, language, reply, reply_audio_base64 }`. Our
  `/api/voice/listen` proxy returns **only `{ transcript }`**; the backend's
  `reply`/audio are ignored (the chat pipeline generates the answer, keeping
  history + guardrails consistent). Recording is captured in-memory, sent,
  discarded — never persisted to DB/disk/logs.
- The mic records via `MediaRecorder`, then resamples to **16 kHz mono WAV**
  in-memory (`src/lib/voice/recorder.ts`) — the format the backend accepted in
  testing (Chrome cannot natively emit MP3). The quiz narrator and the chat
  reply speaker both call `/voice/speak`; narration text is stripped of
  markdown/LaTeX (`src/lib/voice/speech-text.ts`).

## Not on the backend — implemented inside Next.js (decided Phase 6)

| Concern | Where it runs |
| --- | --- |
| Market data (`/market/trending`, `/market/search`, `/market/{symbol}`) | Our route handlers fetch the Yahoo Finance JSON API **server-side** (the API that `yfinance` wraps, `.NS` suffix) with a short TTL cache; response shape stays PRD B5. The browser only calls `/api/market/*`. |
| FOMO quiz | Always local (deterministic, server-side scoring) — never touches the backend. |
| Scan verdict rendering | Backend scans the screenshot (`/scan-image`), but the verdict/risk level and every visible string are computed/translated on our side (`normalize.ts` + `lib/scan/detector.ts` + message files). |

Our side: six Next.js routes sit in front of the backend — `POST /api/assistant`
(forwards to `/chat`), `POST /api/fraud-scan` (forwards to `/scan-image`),
`POST /api/safety-quiz` (start → `/quiz/generate`),
`POST /api/safety-quiz/submit` (grade + persist → `/quiz/submit`),
`POST /api/voice/speak` (TTS → `/voice/speak`) and `POST /api/voice/listen`
(STT → `/voice/listen`), plus
read-only `GET /api/safety-quiz/attempts{,/[id]}` (our Postgres only). They
add the `sg_vid` guard, rate limits, URL-symbol → `target_stock`
canonicalisation (RELIANCE → Reliance, TATAMOTORS → Tata Motors,
ZOMATO/ETERNAL → Zomato, SUZLON → Suzlon; static table in `lib/safety.ts`),
and the verdict (INFORMED / CAUTIOUS / SPECULATIVE, computed from score/total
+ scan risk — never from backend text).
