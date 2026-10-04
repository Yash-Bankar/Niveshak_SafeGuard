/**
 * PRIVACY BY DESIGN — read before editing.
 *
 * Nothing personal is stored in this database. There are no accounts, no
 * login, no email, no name, no phone number — ever. Every row is keyed by
 * `visitor_id`, a random UUID generated in the request proxy and kept in the
 * httpOnly `sg_vid` cookie. The UUID carries no link to identity: clearing
 * cookies simply starts a new, unrelated visitor.
 *
 * safety_attempts must NEVER gain an image or OCR-text column. Uploaded tip
 * screenshots are processed in memory and discarded; only the scan result
 * (risk level + flag titles) is persisted, and only as text.
 */

import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** Per-question detail stored on a safety attempt (text only). */
export interface SafetyAttemptPerQuestion {
  id: string;
  correct: boolean;
  your_answer: string;
  correct_answer: string;
  explanation: string;
}

/** AI conclusion stored on a safety attempt (text only). */
export interface SafetyAttemptConclusion {
  headline: string;
  summary: string;
  strengths: string[];
  risks: string[];
  next_steps: string[];
  mini_lesson: { title: string; body: string };
}

/** The `result` jsonb payload — conclusion + per-question, never image data. */
export interface SafetyAttemptResult {
  per_question: SafetyAttemptPerQuestion[];
  conclusion: SafetyAttemptConclusion;
  verdict_title: string;
}

/**
 * Quiz-only attempt payload (Phase 7 — no screenshot scan yet): backend
 * eligibility + the correct answer letters. The scan flow (PRD Phase 11)
 * will keep storing the full `SafetyAttemptResult` shape.
 */
export interface SafetyAttemptQuizResult {
  eligible: boolean;
  correct_answers: string[];
}

/** Anything legal to store in `safety_attempts.result`. */
export type SafetyAttemptResultPayload =
  | SafetyAttemptResult
  | SafetyAttemptQuizResult;

export const fomoProfiles = pgTable(
  "fomo_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    visitorId: text("visitor_id").notNull(),
    fomoScore: integer("fomo_score").notNull(),
    band: text("band").notNull(),
    answers: jsonb("answers").$type<number[]>().notNull(),
    /**
     * The quiz-derived anchor the live signals nudge (see
     * src/lib/fomo-signals.ts). Null on rows created before the signal
     * feature — the recompute falls back to `fomo_score`.
     */
    baseScore: integer("base_score"),
    /** Last computed signal sub-scores (0–100), null until first recompute. */
    signalLanguage: integer("signal_language"),
    signalReturns: integer("signal_returns"),
    signalPortfolio: integer("signal_portfolio"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("fomo_profiles_visitor_id_idx").on(table.visitorId)]
);

/**
 * Manually recorded holdings — an educational "what I own" note, NOT a trade.
 * There is no execution: the visitor types quantity + buy price themselves
 * (or leaves quantity blank), purely so the FOMO signals can reason about
 * recent returns and portfolio diversity. Keyed by visitor_id like every
 * other table.
 */
export const holdings = pgTable(
  "holdings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    visitorId: text("visitor_id").notNull(),
    symbol: text("symbol").notNull(),
    quantity: doublePrecision("quantity").notNull(),
    buyPrice: doublePrecision("buy_price").notNull(),
    boughtAt: timestamp("bought_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("holdings_visitor_id_idx").on(table.visitorId),
    uniqueIndex("holdings_visitor_symbol_unique").on(
      table.visitorId,
      table.symbol
    ),
  ]
);

export const safetyAttempts = pgTable(
  "safety_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    visitorId: text("visitor_id").notNull(),
    ticker: text("ticker").notNull(),
    tipSource: text("tip_source"),
    scanRiskLevel: text("scan_risk_level"),
    scanFlags: jsonb("scan_flags").$type<string[]>(),
    /** Backend quiz session reference — the sg_vid visitor id (session-keyed). */
    quizId: text("quiz_id").notNull(),
    answers: jsonb("answers").$type<Array<string | null>>().notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    verdictCode: text("verdict_code").notNull(),
    result: jsonb("result").$type<SafetyAttemptResultPayload>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("safety_attempts_visitor_id_idx").on(table.visitorId)]
);

export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    visitorId: text("visitor_id").notNull(),
    symbol: text("symbol").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("watchlist_visitor_id_idx").on(table.visitorId),
    uniqueIndex("watchlist_visitor_symbol_unique").on(
      table.visitorId,
      table.symbol
    ),
  ]
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    visitorId: text("visitor_id").notNull(),
    role: text("role").notNull(),
    content: text("content").notNull(),
    locale: text("locale").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chat_messages_visitor_created_idx").on(
      table.visitorId,
      table.createdAt
    ),
  ]
);

export type FomoProfile = typeof fomoProfiles.$inferSelect;
export type NewFomoProfile = typeof fomoProfiles.$inferInsert;
export type SafetyAttempt = typeof safetyAttempts.$inferSelect;
export type NewSafetyAttempt = typeof safetyAttempts.$inferInsert;
export type WatchlistRow = typeof watchlist.$inferSelect;
export type NewWatchlistRow = typeof watchlist.$inferInsert;
export type HoldingRow = typeof holdings.$inferSelect;
export type NewHoldingRow = typeof holdings.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
