CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"locale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fomo_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" text NOT NULL,
	"fomo_score" integer NOT NULL,
	"band" text NOT NULL,
	"answers" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" text NOT NULL,
	"ticker" text NOT NULL,
	"tip_source" text,
	"scan_risk_level" text,
	"scan_flags" jsonb,
	"quiz_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"verdict_code" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" text NOT NULL,
	"symbol" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "chat_messages_visitor_created_idx" ON "chat_messages" USING btree ("visitor_id","created_at");--> statement-breakpoint
CREATE INDEX "fomo_profiles_visitor_id_idx" ON "fomo_profiles" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "safety_attempts_visitor_id_idx" ON "safety_attempts" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "watchlist_visitor_id_idx" ON "watchlist" USING btree ("visitor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_visitor_symbol_unique" ON "watchlist" USING btree ("visitor_id","symbol");