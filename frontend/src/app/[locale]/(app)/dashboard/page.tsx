import { eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { fomoProfiles, watchlist } from "@/db/schema";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { DashboardActions } from "@/components/features/dashboard/DashboardActions";
import { Disclaimer } from "@/components/features/Disclaimer";
import { DashboardMarket } from "@/components/features/market/DashboardMarket";
import { SearchBar } from "@/components/features/market/SearchBar";
import { redirect } from "@/i18n/navigation";
import { greetingSlotFor, tipIndexFor } from "@/lib/dashboard";
import { asFomoBand, bandMeta } from "@/lib/fomo-bands";
import { getTrending, type TrendingFeed } from "@/lib/market";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";

/**
 * Dashboard = the post-FOMO home. STRICT first-run gate: no profile yet →
 * redirect to /fomo-quiz (the quiz itself bounces back here once done).
 * Phase 8 layout: greeting + search, Market Pulse hero, indices, watchlist,
 * trending, gainers/losers (inside DashboardMarket), then the FOMO card.
 */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const visitorId = await getVisitorId();
  if (!visitorId) throw redirect({ href: "/", locale });

  const rows = await db
    .select({ fomoScore: fomoProfiles.fomoScore, band: fomoProfiles.band })
    .from(fomoProfiles)
    .where(eq(fomoProfiles.visitorId, visitorId))
    .limit(1);
  const profile = rows[0];
  if (!profile) throw redirect({ href: "/fomo-quiz", locale });

  const symbols = await db
    .select({ symbol: watchlist.symbol })
    .from(watchlist)
    .where(eq(watchlist.visitorId, visitorId))
    .orderBy(watchlist.addedAt)
    .limit(10);

  const t = await getTranslations("dashboard");
  const tFomo = await getTranslations("fomo");

  const band = asFomoBand(profile.band);
  const meta = bandMeta(band);
  const score = profile.fomoScore;
  const bandTitle = tFomo(meta.labelKey);

  const greeting = t(`greeting.${greetingSlotFor(new Date().getHours())}`);
  const tipNumber = tipIndexFor() + 1;

  let feed: TrendingFeed | null = null;
  try {
    feed = await getTrending();
  } catch {
    feed = null;
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-white/50">{t("subtitle")}</p>
        <SearchBar className="mt-4" />
      </div>

      <DashboardMarket
        initial={feed}
        watchlistSymbols={symbols.map((row) => row.symbol)}
        tipNumber={tipNumber}
      >
        <Card className="mt-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wider text-white/40">
                {t("fomoCardTitle")}
              </h2>
              <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-white">
                {score}
                <span className="text-lg font-normal text-white/40">/100</span>
              </p>
            </div>
            <Badge
              variant={
                band === "green"
                  ? "positive"
                  : band === "yellow"
                    ? "warning"
                    : "negative"
              }
            >
              {bandTitle}
            </Badge>
          </div>

          {/* Band scale: green 0–35, yellow 36–70, red 71–100. */}
          <div className="relative mt-4" aria-hidden>
            <div className="flex h-2 overflow-hidden rounded-full">
              <span
                className="h-full bg-emerald-500/70"
                style={{ width: "35%" }}
              />
              <span
                className="h-full bg-amber-500/70"
                style={{ width: "35%" }}
              />
              <span className="h-full bg-red-500/70" style={{ width: "30%" }} />
            </div>
            <span
              className="absolute -top-0.5 h-3 w-1 -translate-x-1/2 rounded-full bg-white shadow"
              style={{ left: `${score}%` }}
            />
          </div>

          <p className="mt-3 text-sm leading-relaxed text-white/60">
            {tFomo(`bands.${band}.desc`)}
          </p>
        </Card>
      </DashboardMarket>

      <div className="mt-4">
        <DashboardActions />
      </div>

      <Disclaimer className="mt-8" />
    </div>
  );
}
