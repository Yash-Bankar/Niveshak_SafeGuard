# Niveshak SafeGuard

Educational, SEBI-aligned investor-safety web app for Indian retail investors.
It teaches, scores behavioral risk (FOMO), and warns before a user acts on a tip.
**No trade execution, no buy/sell/hold advice, no price predictions — ever.**
Hackathon prototype (SANGYAN problem statement): authentication is intentionally
absent; a browser is identified only by an anonymous `sg_vid` cookie.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router, TypeScript strict) |
| Styling | Tailwind CSS v4 (tokens via `@theme` in `src/app/globals.css`) |
| Motion | framer-motion |
| Charts | recharts |
| Icons | lucide-react |
| Auth | None (anonymous `sg_vid` visitor cookie — see locked decisions) |
| DB | Neon Postgres + drizzle-orm + @neondatabase/serverless + drizzle-kit |
| i18n | next-intl (locales `en`, `hi`, `mr`) |
| Validation | zod |
| Client state | zustand |
| Backend | FastAPI LLM backend (separate repo/machine) — reached only from server code |

## Locked decisions (PRD v2.1, section B2)

| Topic | Decision |
| --- | --- |
| Project name | **Niveshak SafeGuard** everywhere (titles, metadata, README, UI) |
| Trading | No buy/sell execution. Deposit/withdraw/keypad screens are out of scope. The stock page's primary CTA is "Take safety quiz before you trade". |
| Screenshot handling | Uploaded image is sent to the backend **in memory only**, scanned, discarded. Not written to Neon, not written to disk by our code, not logged. Only the scan *result* (flags, risk level) is cached client-side in `sessionStorage` for 30 minutes and (flags + level only) saved on the quiz attempt row. |
| Auth | **None for now** — hackathon organizers asked to remove auth at the prototyping stage. No login, no accounts, no Google. A browser is identified only by a random anonymous `sg_vid` cookie (random UUID, no personal data) so FOMO score, watchlist, chat history and quiz attempts persist on that device. The chosen language is stored in an `sg_lang` cookie. Auth can be added back later by swapping `visitor_id` for a real user id. |
| Hackathon guardrails (SANGYAN problem statement) | **Never build:** stock tips, buy/sell/hold signals, price predictions, trading algorithms, personalised recommendations ("based on your profile, buy XYZ"), or promotion of any instrument or broker; monetisation funnels (commissions, margin/loan nudges, paid upsells); harvesting of SMS/OTPs or personally identifiable financial records. **Allowed:** using market data for education, awareness, simulation and safety (e.g. explaining what volatility means). The product must read as public-good investor-protection infrastructure and be honest about uncertainty. Every AI output (assistant, scan explanation, quiz, verdict, next steps, mini-lesson) must obey this — violations are disqualifying. |
| DB | Neon Postgres via Drizzle ORM |
| Languages | `en`, `hi`, `mr`. URL-prefixed (`/en/...`). Same code is sent to the backend as `language`. |
| Quiz length | 5 LLM-generated MCQs |
| FOMO score | Computed deterministically in the web app from a 6-question quiz (no LLM). Higher = more impulsive. |
| Bottom dock (mobile) | Home → Markets → Safety → Profile. Desktop uses a top nav with the same four links. |
| Market data | All stock data comes from the backend (yfinance, `.NS` suffix). The browser never calls a market API directly. |
| Language of the AI's output | Entire LLM output in the chosen language; tickers and numbers stay in Latin digits/letters. |

## Folder conventions

```
src/app/[locale]/(public)   landing, select-language
src/app/[locale]/(app)      dashboard, markets, stock, safety-quiz, safety, profile, fomo-quiz
src/app/api/                route handlers (proxy to the FastAPI backend)
src/db/                     drizzle schema + client
src/lib/                    env, visitor, rate-limit, fomo, format, backend client, stores
src/components/ui/          primitives (Button, Card, Modal, …)
src/components/features/    feature components (shell, market, fomo, chat, …)
src/messages/               next-intl messages: en.json, hi.json, mr.json
```

## Coding rules

- TypeScript strict, **no `any`**.
- Zod-validate every API input (route handler bodies and queries).
- Server components by default; `"use client"` only when needed.
- Never expose backend URL/keys to the client (`LLM_BACKEND_URL`, `LLM_BACKEND_API_KEY`
  are server-only; the browser only ever calls our `/api/*` routes).
- Never persist uploaded screenshots (no fs writes, no DB columns, no logs).
- No authentication exists — identify a browser only through the `sg_vid` cookie
  via `src/lib/visitor.ts`.
- Follow the hackathon guardrails row of the locked decisions (no stock tips,
  no buy/sell/hold, no predictions, no broker promotion) in every feature and
  in every LLM prompt we author.
- All user-facing strings come from next-intl keys — no hardcoded text.
- Numbers (prices, tickers, percentages, scores) use `font-mono tabular-nums`.
- Dates/numbers use `Intl.*` with the active locale (Indian grouping for INR).

## Next.js 16 note

This is NOT the Next.js you may know — breaking changes apply.
`middleware.ts` is deprecated and renamed **`proxy.ts`**.
Before writing framework integration code, read the relevant guide in
`node_modules/next/dist/docs/` (the installed version's docs), and read the
installed docs of next-intl / drizzle / better-* libs before integrating them.

## PowerShell note

This project is developed on Windows PowerShell:
use `;` to chain commands (never `&&`), and `curl.exe` (not `curl`, which is
an alias for `Invoke-WebRequest`).
