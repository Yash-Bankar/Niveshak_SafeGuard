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
| `common` | App-wide buttons & labels | getStarted, goToDashboard, howItWorks, loading, retry, close, back, next, continue, cancel, seeAll, changeLanguage, appName |
| `common.check` | Temporary visitor-check dashboard (replaced in Phase 5) | dev/verification strings |
| `nav` | Top nav / bottom dock (Phase 5) | home, markets, safety, profile |
| `landing.meta` | Landing page metadata | title, description |
| `landing.hero` | Landing hero + phone mock visual | headline, sub, fomoLabel, fomoBand, flagChip ("Red flag detected: promises guaranteed returns") |
| `landing.features` | 3 feature cards | educator / fomo / scanner — title + body each |
| `landing.how` | 4-step "How it works" timeline | steps 1–4, title + body each |
| `landing.trust` | Trust strip | educational, noTrading, noScreenshots, sebi |
| `landing.finalCta` | Final CTA section | title, body |
| `landing.footer` | Landing footer | disclaimer line |
| `language` | First-run language selection page | title, subtitle, saving, cards (names/descriptions per language) |
| `errors` | not-found + generic error boundaries | notFound (title/body/home), generic (title/body/retry) |
| `disclaimer` | Reusable disclaimer footer (stock/quiz pages) | footer line |
| `fomo` | FOMO quiz (Phase 7) | placeholder title only for now |
| `market` | Markets (Phase 8) | placeholder title only for now |
| `stock` | Stock detail (Phase 9) | placeholder title only for now |
| `safety` | Safety flow (Phase 10–11) | placeholder title only for now |
| `chat` | Assistant bubble (Phase 6) | placeholder title only for now |
| `profile` | Profile page (Phase 5) | placeholder title only for now |

## Review checklist

1. Do `hi` / `mr` values sound like something a first-time investor would say,
   not a textbook?
2. Guardrails: no copy may promise returns, recommend a stock, or promote a
   broker — including the translations.
3. The word "FOMO" stays as Latin "FOMO" in all locales (brand metric).
4. SEBI stays "SEBI" in all locales.
