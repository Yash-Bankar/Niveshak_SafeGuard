# Phase log

Records of completed PRD phases. Note: earlier sessions' phase 7/8 records
were not persisted to this file — the log starts at Phase 9.

### phase 9 — Stock Detail Screen (PRD `docs/PRD.md` lines 601–631)

The Phase 7 stock build already covered most of this prompt (server-side
symbol validation + first-paint `getStockDetail(upper, "1M")`, refetch via
`/api/market/[symbol]?range=` with keep-old-data shimmer, app-styled
not-found/error cards, `max-w-2xl` layout, header stats, chart with
timeframe pills, volatility gauge + 50/30/20 modal, four tabs, safety CTA
card + fixed bottom bar, disclaimer, `generateMetadata`). Phase 9 added the
missing pieces:

- **Watchlist star** — `StockView` top-nav placeholder replaced with a
  `motion.button` Star (amber fill when watched, `aria-pressed`, translated
  label). Optimistic toggle → `POST`/`DELETE /api/watchlist {symbol}`;
  reverts + error toast on failure, success toast on ok. Initial state is
  queried server-side in `stock/[symbol]/page.tsx` (`getVisitorId()` +
  `(visitor_id, symbol)` lookup, try/catch → `false`), so the star survives
  reloads and matches the dashboard carousel.
- **`ToastProvider` mounted** in `(app)/layout.tsx` (component existed since
  Phase 2 but was never mounted anywhere).
- **i18n ×3**: added `stock.watch.{add,remove,added,removed,error}` and
  `stock.chart.aria`; `stock.metaTitle` em dash → `•` per spec;
  `stock.notFound.body` aligned to spec wording ("We couldn't find that
  stock"). Now **286 keys × en/hi/mr, 0 drift**.
- **`PriceChart`**: tooltip no longer shows the hardcoded English word
  "Price" (value + IST time only; `separator=""` + empty name so recharts
  doesn't fall back to the raw `close` dataKey); `ariaLabel` is now a
  required prop, passed `t("chart.aria")`.
- **Header subtext**: `NSE • <sector>` per spec instead of Yahoo's
  `fullExchangeName` (universe is 100% `.NS`).

Deliberate deviations:

- Faint horizontal gridlines kept (user preference) despite the PRD's
  "no gridlines"; right-side price axis kept for readability.
- Invalid/unknown symbols render the app-styled not-found card instead of
  `next/notFound()` — locked decision from Phase 7.
- "Volatility score equals the backend's" done-when is N/A: market data and
  volatility scoring run inside Next.js (see `docs/backend-contract.md`).

Verified: `tsc --noEmit` ✓ · `eslint` ✓ · 23/23 tests ✓ · `next build` ✓ ·
286 keys × 3 locales, 0 drift.

### phase 10 — 3-step safety flow (source → scan → quiz)

Replaces the single-page safety-quiz entry with the PRD's three-step flow.
All work done inside Next.js per `docs/backend-contract.md` line 90 (fraud
scan never leaves the app).

- **Store** `src/lib/stores/safetyFlow.ts` rewritten: per-ticker key
  `safety:{ticker}` with 30-min TTL, steps `source | scan | quiz`, actions
  `begin/restore/setScanned/editSource/startQuiz/backToScan/setAnswer/
  goNext/goBack/reset`; legacy `sg_safety_flow_v1` key cleaned up on
  restore. `quizTopic` captured from the quiz response (falls back to
  per-question `classifyTopic`).
- **Detector** `src/lib/scan/detector.ts` — pure port of the Python
  `scam_detector.py` (B5): 13 keywords → 9 flag codes × +35 capped 100,
  IN-style regex, verdicts `critical/caution/warning/pass` + `unknown`
  (<15 chars), verdict matrix → `risk_level`. 8 unit tests mirror the
  Python terminal cases (31/31 green).
- **OCR** `src/lib/scan/ocr.ts` — tesseract.js worker (`eng+hin+mar`,
  CDN lang data), serialized via promise chain, 80 s timeout → 503
  `ocr_unavailable`, worker reset on failure.
- **Route** `src/app/api/fraud-scan/route.ts` — visitor + dual rate limit
  (6/10 min per visitor and per IP), 4 MB limit, magic-byte sniff
  (PNG/JPEG/WEBP), in-memory scan only (no fs/DB/logs — locked decision),
  translated template output, `scan_id` uuid, `no-store`.
- **Quiz routes** — start/submit bodies now `{ticker, locale, tipSource?,
  scanSummary?}` / `{answers, ticker, quizId?, tipSource?, scanSummary?}`;
  both load the latest `fomo_profiles` row and forward `fomo_score/
  fomo_band` as undeclared extras (FastAPI ignores unless backend opts in).
  Submit stores `tip_source/scan_risk_level/scan_flags/quiz_id` on the
  `safety_attempts` row and returns the B5 verdict via the new
  `verdictFor(score, total, scanRisk?)` in `src/lib/safety.ts` (boundary
  fix: `pct <= 0.4` → SPECULATIVE; INFORMED requires `pct >= 0.8` AND
  scanRisk null/low). Backend 404 on submit → `quiz_expired` → 410 →
  toast + `backToScan()`.
- **UI** — `SafetyQuizFlow` orchestrator + `SourceStep` (chips, dropzone,
  paste, 90 s abort, inline validation), `ScanAnimation` (dot stays on 1,
  sweep line, reduced-motion safe), `ScanReportCard` (risk badge + meter,
  flags, registration check, explanation, disclaimer, unknown → 3 actions,
  high-risk acknowledgement gate). Quiz generation spinner plays on step 2
  (`GeneratingView`, dot advances to 3). Dot state via `steps.progress`.
- **Detector/scan copy guardrail**: renders "red flags / warning signs",
  never "scam"; backend `feedback`/`message` strings are never rendered.
- **i18n ×3**: `steps`, `step1`, `scanErrors`, `scan` (incl. 9 flag
  rule pairs + 5 explanations) + `quiz.{loadM1-3,cancel,topic,expired}` —
  now **374 keys × en/hi/mr, 0 drift**.
- `next.config.ts`: `serverExternalPackages: ["tesseract.js"]`.

Deliberate deviations:

- Scan + quiz-generation animations are split across steps 1 and 2 (PRD's
  single "scanning" screen) so the progress dot always matches what the
  backend is actually doing.
- Start request still sends `locale` in the body (in addition to the
  `x-locale` header) — harmless, the backend reads only what it declares.
- FOMO score is forwarded best-effort (latest profile row, try/catch →
  null) rather than required — matches the contract's optional extras.

Verified: `tsc --noEmit` ✓ · `eslint` ✓ (0 warnings) · 31/31 tests ✓ ·
`next build` ✓ (incl. `/api/fraud-scan`) · 374 keys × 3 locales, 0 drift.

### phase 11 — Backend v2 API migration (scan via `/scan-image`)

The backend owner shipped a new API surface (pasted Swagger) and asked us to
replace our in-Next.js image scanning with their `POST /scan-image`. Full
contract recorded in `docs/backend-contract.md` (supersedes the old one).

- **`POST /api/fraud-scan` rewritten** — validates the upload (visitor, dual
  rate limit, 4 MB, magic bytes — unchanged), forwards the image **in
  memory** to the backend's `/scan-image` (multipart field `file`, 100 s
  timeout), then renders the result with our translated templates. The
  backend's verdict prose is never forwarded: `src/lib/scan/normalize.ts`
  (new) defensively parses the untyped response (verdict string / scam
  boolean / Python detector report / structured flags / one wrapper level)
  and `verdictFrom` (Python-parity matrix) recomputes verdict + risk level.
  Errors: 502 `scan_failed`, 503 `ocr_unavailable`, 504 `timeout`.
  `USE_MOCK_BACKEND=true` returns a fixed high-risk demo result (offline flow).
- **tesseract.js removed** — `src/lib/scan/ocr.ts` deleted, package
  uninstalled, `serverExternalPackages` dropped from `next.config.ts`.
- **`detector.ts` slimmed** — `analyzeTip` (the in-app text analyzer) removed;
  kept `RED_FLAG_RULES` / `FlagCode` / `mapPhraseToCodes` /
  `findRegistrationNumbers` / `verdictFrom` / `riskLevelFor` as the shared
  primitives. Its 8 old tests replaced by 14 `normalize.test.ts` tests.
- **Path swaps** — `POST /assistant` → `/chat` (response now
  `{reply, rag_sources_used, live_data_used}`), `POST /quiz` →
  `/quiz/generate`. `GET /quiz` (supported stocks) no longer exists on the
  backend → `getQuizStocks`/`normalizeStockNames`/`resolveQuizStockSymbols`
  deleted; unsupported-card chips use the static `FALLBACK_QUIZ_STOCKS`.
  Unused-for-now backend endpoints (`/language`, `/languages`,
  `/quiz/voice`, `/analyze-fomo`, `/market-alerts`, `/chat/history`)
  documented but not called.
- **Paste path removed** (backend owner: "require a screenshot") — `SourceStep`
  is upload-only; `tipText` dropped from the store (`safetyFlow`), the
  `onScanned` payload and persistence. Unknown-scan card now has two actions
  (clearer screenshot / skip).
- **i18n ×3** — reworded subtitle/needContent/privacy + `scanErrors`
  (dropped all "paste instead" copy), added `scanErrors.unavailable`, deleted
  `step1.orPaste` / `step1.pastePlaceholder` / `scanErrors.pasteInstead` /
  `scan.unknown.action3` → **371 keys × en/hi/mr, 0 drift**.
- **Quiz fix (live-shape bug)** — once the backend LLM was back, `/api/safety-quiz`
  still 502'd: the verified `/quiz/generate` 200 puts the questions in a
  top-level `quiz` **array** (`{ session_id, ticker, beta, language, quiz: [
  { question, options: {A…D}, voice_url } ] }`), but `normalizeQuizStart`
  only unwrapped object envelopes, so it returned null → `bad_response`.
  `normalizeQuizStart` now reads the `quiz` array (still accepts top-level
  `questions` / nested `{quiz:{questions}}` / `data` / `result`), echoes the
  `ticker`; +1 regression test using the exact live body (35 total).
- **LaTeX math in quiz text cleaned** — the LLM wraps numbers in math markup
  (`$\leq$ 1%`, `$> $1$\%$`) which rendered raw. New `cleanMathText`
  (`src/lib/backend/cleanText.ts`, +5 tests) converts symbols/escapes/fractions
  to readable Unicode and strips delimiters; `normalizeQuizStart` applies it to
  the question and all four options.
- **Nav FOMO meter blanked after refresh (fixed)** — `GET /api/fomo` returned
  Drizzle's camelCase alias `fomoScore` while the zustand store reads
  `fomo_score`, so after any full page load the meter got `undefined` and fell
  back to the dashed "—" (the dashboard still showed the score because it reads
  the field directly). The GET route now returns `fomo_score`, and
  `parseFomoProfileSummary` accepts either spelling defensively (+3 tests).
  Safety-quiz completion does not change the FOMO score by design (PRD B6 —
  FOMO is the separate 6-question quiz); the meter now simply stays visible.

Open item: the backend was unreachable while updating (connection timeout),
so `/scan-image`'s real response shape is unprobed — the normalizer covers
the plausible shapes and falls back to 502; re-verify with one Swagger
"Try it out" when the other PC is up and tighten `normalize.ts` if needed.

Verified: `tsc --noEmit` ✓ · `eslint` ✓ (0 warnings) · 40/40 tests ✓ ·
371 keys × 3 locales, 0 drift · `next build` ✓.

### phase 12 — Live FOMO score (quiz anchor + 3 signals + holdings)

The owner asked the FOMO score to keep updating after the initial quiz, from
three things: the visitor's chat wording, recent returns, and portfolio
diversity/monitoring (blueprint: the user's `evaluate_fomo` py file).

- **Composite score** — `src/lib/fomo-signals.ts` (pure, +12 tests):
  `final = 0.5·base + 0.2·language + 0.2·returns + 0.1·portfolio`, same
  green ≤35 / yellow ≤70 / red thresholds. `recomputeFomo`
  (`src/lib/fomo-recompute.ts`, server-only) orchestrates DB + market.
  - language: panic/urgency + all-in wording in the visitor's own recent
    chat messages (en/hi/mr phrase lists).
  - returns: "chasing overheated gains" — holdings/watchlist stocks near
    their 52-wk high, RSI(14) > 70/75, or up sharply in ~1 month.
  - portfolio: few holdings / one-sector concentration + a thin watchlist.
- **Holdings table** — `holdings` (symbol, quantity, buy_price, bought_at)
  + `/api/holdings` CRUD and a Profile-page `PortfolioCard` (educational
  "what I own" note, never a trade). DELIBERATE DEVIATION: adds a 5th table
  beyond the PRD's "only 4 tables" done-check — the owner explicitly chose a
  real holdings table over the watchlist proxy. `fomo_profiles` gained
  `base_score` + `signal_language/returns/portfolio` + `updated_at`.
  Migration `drizzle/0001_dark_mystique.sql` applied to Neon.
- **Recompute triggers** — awaited (best-effort) after each chat turn, on
  watchlist add/remove, on holdings add/remove, and on safety-quiz submit;
  `useFomoStore.refresh()` re-fetches so the nav meter updates without a
  reload. The quiz POST now sets `base_score`.
- i18n `portfolio` namespace × 3 (384 keys/file).
- **Scan runtime crash fixed** — `SourceStep.runScan` used
  `return Promise.reject(code)` inside an `async`/`try` block, which bypasses
  `catch`; a failed scan (backend `/scan-image` host offline) therefore
  escaped as an unhandled rejection and Next dev showed
  "Runtime Error: scan_failed" instead of the friendly card. Changed to
  `throw code` so `mapScanError` → `scanErrors.unavailable` renders.
  (`SafetyQuizFlow`'s two `Promise.reject` calls are inside `.then()` chains,
  where returning a rejected promise IS caught — left as-is.)

Verified: `tsc --noEmit` ✓ · `eslint` ✓ (0 warnings) · 55/55 tests ✓ ·
384 keys × 3 locales, 0 drift · `next build` ✓.

### phase 13 — Voice (mic + TTS) for chat and all quizzes

Backend shipped a voice gateway; wired it through server proxies so the
backend URL/key never reach the browser (verified live: `/voice/speak`
returns raw `audio/mpeg`; `/voice/listen` returns
`{transcript, language, reply, reply_audio_base64}`).

- **Proxies** — `POST /api/voice/speak` (JSON `{text}` → streams audio bytes)
  and `POST /api/voice/listen` (multipart `audio` → `{transcript}`), both with
  the `sg_vid` guard + rate limits. Client: `src/lib/backend/voice.ts` +
  `voice-normalize.ts` (+5 tests).
- **Mic (chat)** — `MicButton` records via `MediaRecorder`, resamples to
  16 kHz mono WAV in-memory (`src/lib/voice/recorder.ts`), sends it to
  `/api/voice/listen`, and drops the transcript straight into the chat as the
  prompt. Audio is never persisted.
- **Reply speaker (chat)** — `SpeakButton` on every assistant message reads
  the reply via `/api/voice/speak` (markdown/LaTeX stripped first by
  `toSpeechText`).
- **Quiz narration (both quizzes)** — `NarrationControls` (replay + mute) in
  the FOMO quiz and the safety quiz; auto-reads the question + lettered
  options when each question appears (`buildNarration`), with a persisted
  mute toggle (`localStorage` `sg_voice_muted`). Stops on question change /
  unmount. Browser autoplay blocks fall back to the manual replay button.
- i18n `voice` namespace × 3.
- Added `vitest.config.ts` (`@` → `src` alias) so tests can import shared
  modules that use the path alias.

Verified: `tsc --noEmit` ✓ · `eslint` ✓ (0 warnings) · 65/65 tests ✓ ·
398 keys × 3 locales, 0 drift · `next build` ✓ (incl. `/api/voice/speak`,
`/api/voice/listen`).
