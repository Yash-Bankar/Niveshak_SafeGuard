# i18n review guide — Niveshak SafeGuard

For a native speaker: review each string group below in
`src/messages/{en,hi,mr}.json`. Translations should read as **natural, simple,
non-literal language suitable for first-time investors** — not word-by-word.
Keep the brand name "Niveshak SafeGuard", ticker symbols and numbers in Latin
script in all locales.

## Conventions

- Locales: `en` (default), `hi`, `mr`. URL-prefixed (`/en/…`).
- The ICU syntax is not used yet — plain strings only (watch for future `{…}`).
- `language.cards.*` names/descriptions are **intentionally identical in all
  three files**: each card describes its own language in that language.

## String groups

| Namespace | Used by | Notes |
| --- | --- | --- |
| `common` | App-wide buttons & labels | getStarted, goToDashboard, howItWorks, loading, retry, close, back, next, continue, cancel, seeAll, changeLanguage, comingSoon, appName |
| `nav` | TopBar / BottomDock nav (Phase 5) | main (aria-label), home, markets, safety, profile |
| `dashboard` | Dashboard placeholder (Phase 5) | title, subtitle, body |
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
| `fomo` | FOMO meter slot + fomo-quiz placeholder | title, subtitle, body, takeTheQuiz (tooltip "Take the quiz") |
| `market` | Markets placeholder (Phase 8 fills) | title, subtitle, body |
| `stock` | Stock detail (Phase 9) | placeholder title only for now |
| `safety` | Safety placeholder — history list empty state (Phase 10 fills) | title, subtitle, historyTitle, emptyHistory |
| `chat` | AssistantBubble aria/title (Phase 6 fills) | title, bubbleLabel |
| `profile` | Profile page (Phase 5) | title, anonymousNote, languageTitle, fomoTitle, fomoBody, privacyTitle, privacyBody |

## Review checklist

1. Do `hi` / `mr` values sound like something a first-time investor would say,
   not a textbook?
2. Guardrails: no copy may promise returns, recommend a stock, or promote a
   broker — including the translations.
3. The word "FOMO" stays as Latin "FOMO" in all locales (brand metric).
4. SEBI stays "SEBI" in all locales.
