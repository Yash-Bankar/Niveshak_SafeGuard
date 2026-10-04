# i18n review guide — Niveshak SafeGuard

For a native speaker: review each string group below in
`src/messages/{en,hi,mr}.json`. Translations should read as **natural, simple,
non-literal language suitable for first-time investors** — not word-by-word.
Keep the brand name "Niveshak SafeGuard", ticker symbols and numbers in Latin
script in all locales.

## Conventions

- Locales: `en` (default), `hi`, `mr`. URL-prefixed (`/en/…`).
- The ICU syntax is not used yet — plain strings with `{…}` placeholders only.
  Placeholders must appear in **all three** locales for the same key:
  `{time}`, `{symbol}`, `{score}`, `{total}`, `{current}`, `{band}`, `{q}`,
  `{numbers}`.
- `language.cards.*` names/descriptions are **intentionally identical in all
  three files**: each card describes its own language in that language.

## String groups

| Namespace | Used by | Notes |
| --- | --- | --- |
| `common` | App-wide buttons & labels | getStarted, goToDashboard, howItWorks, loading, retry, close, back, next, continue, cancel, seeAll, changeLanguage, comingSoon, appName |
| `nav` | TopBar / BottomDock nav (Phase 5) | main (aria-label), home, markets, safety, profile |
| `dashboard` | Dashboard (Phases 7–8) | subtitle, body, fomoCardTitle, actionAssistant/actionMarkets/actionSafety, greeting (morning/afternoon/evening), pulse.tipLabel, tips.tip1–5 (safety tip of the day — behavioural warnings only, never stock advice), watchlist (title/empty), trending.title, movers (title/subtext). `title` removed in Phase 8 (greeting replaced it); `indicesTitle` removed (indices strip dropped from the dashboard — only /markets shows it now). |
| `landing.meta` | Landing page metadata | title, description |
| `landing.hero` | Landing hero + phone mock visual | headline, sub, fomoLabel, fomoBand, flagChip ("Red flag detected: promises guaranteed returns") |
| `landing.features` | 3 feature cards | educator / fomo / scanner — title + body each |
| `landing.how` | 4-step "How it works" timeline | steps 1–4, title + body each |
| `landing.trust` | Trust strip | educational, noTrading, noScreenshots, sebi |
| `landing.finalCta` | Final CTA section | title, body |
| `landing.footer` | Landing footer | disclaimer line |
| `language` | First-run language selection page + profile language cards | title, subtitle, saving, cards (names/descriptions per language) |
| `errors` | not-found + error boundary (Phase 5) | notFound (title/body/home), generic (title/body/retry — "Try again" button) |
| `disclaimer` | `src/components/features/Disclaimer.tsx` (stock/quiz pages) | footer line |
| `fomo` | FOMO meter + fomo-quiz page (Phase 7) | title, subtitle, body, takeTheQuiz, quizTitle, meterAria `{score}{band}`, quiz (progress `{current}{total}`, next/back/submit, q1–q6 question + options a–d), errors (generic, rateLimited), reveal (note, cta), bands (green/yellow/red title + desc). Review q1–q6 wording against PRD B6. |
| `market` | Markets page + market components (Phases 7–8) | title, subtitle, body, open, closed, updated `{time}`, unavailable, indicesUnavailable, infoOnly, moversLabel (guardrail line under every trending/gainers/losers list), emptyList, tabs (gainers/losers/mostActive), search (placeholder/clear/loading/noFound `{q}`/openSymbol `{symbol}`). The infoOnly and moversLabel lines must stay pure disclosures in all locales. |
| `stock` | Stock detail page (Phase 7) | metaTitle `{symbol}`, chart/stats (incl. breakdownTitle, positionTitle), vol (gauge labels + 5-part explain modal), about, tabs, glossary + glossary.explain (marketCap/pe/dividendYield/beta), forecast (incl. ask `{symbol}`), cta, notFound, unavailable. |
| `safety` | Safety hub + 3-step safety flow (Phases 7, 10–11) | history (title/empty/emptyCta/newCheck), verdict titles (INFORMED/CAUTIOUS/SPECULATIVE), `steps` (source/scan/quiz + `progress` `{current}`), `step1` (source chips, screenshot-only dropzone — no paste path since Phase 11, privacy note), `scanErrors` (rateLimited/tooLarge/badType/ocrUnavailable/timeout/invalid/generic/unavailable/retry/remove), `scan` (analyzing + status1–3, reportTitle, score, risk low/medium/high/unknown, flagsTitle/noFlags, registration found `{numbers}`/notFound, explanation × 5, disclaimer, `flags.{CODE}.{title,detail}` × 9, understood/understandRequired/editSource/continue, unknown.action1–2), quiz (metaTitle `{symbol}`, unsupported, progress `{current}{total}`, answerAll, keyboardHint, loadM1–3, cancel, expired, topic risk/business/horizon/regulation/volatility), errors, result. **Guardrail: all scan copy says "red flags / warning signs", never "scam".** The 9 flag codes are untranslated engine values — translate only their title/detail. |
| `chat` | Assistant chat panel (Phase 6) | title, bubbleLabel, online, welcome, placeholder, send, disclaimer, errorBody, rateLimited, suggestions.1–4 |
| `profile` | Profile page (Phase 5) | title, anonymousNote, languageTitle, fomoTitle, fomoBody, privacyTitle, privacyBody |
| `portfolio` | Profile page — educational holdings note (Phase 12) | title, note, symbol, symbolPlaceholder, quantity, buyPrice, add, added, removeAria `{symbol}`, empty, error, invalid, full |
| `voice` | Voice features (Phase 13): chat mic + reply speaker, quiz narration + mute | listenAria, stopAria, recording, transcribing, speakAria, stopSpeakingAria, muteAria, unmuteAria, replayAria, unsupported, permissionDenied, listenError, speakError, emptyTranscript |

## Review checklist

1. Do `hi` / `mr` values sound like something a first-time investor would say,
   not a textbook?
2. Guardrails: no copy may promise returns, recommend a stock, or promote a
   broker — including the translations.
3. The word "FOMO" stays as Latin "FOMO" in all locales (brand metric).
4. SEBI stays "SEBI" in all locales.
5. Key-path parity across `en` / `hi` / `mr` is machine-checked (398 keys each
   as of Phase 13) — if you add keys, add them to all three files.
