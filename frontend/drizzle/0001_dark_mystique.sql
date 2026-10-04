CREATE TABLE "holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" text NOT NULL,
	"symbol" text NOT NULL,
	"quantity" double precision NOT NULL,
	"buy_price" double precision NOT NULL,
	"bought_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fomo_profiles" ADD COLUMN "base_score" integer;--> statement-breakpoint
ALTER TABLE "fomo_profiles" ADD COLUMN "signal_language" integer;--> statement-breakpoint
ALTER TABLE "fomo_profiles" ADD COLUMN "signal_returns" integer;--> statement-breakpoint
ALTER TABLE "fomo_profiles" ADD COLUMN "signal_portfolio" integer;--> statement-breakpoint
ALTER TABLE "fomo_profiles" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "holdings_visitor_id_idx" ON "holdings" USING btree ("visitor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "holdings_visitor_symbol_unique" ON "holdings" USING btree ("visitor_id","symbol");