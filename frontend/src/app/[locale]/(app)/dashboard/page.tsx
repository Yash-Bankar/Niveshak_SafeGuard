import { eq } from "drizzle-orm";
import { ShieldAlert } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { fomoProfiles, watchlist } from "@/db/schema";
import { Container } from "@/components/ui/Container";
import { DashboardActions } from "@/components/features/dashboard/DashboardActions";
import { DashboardFomoCard } from "@/components/features/fomo/DashboardFomoCard";
import { GuideButton } from "@/components/features/guide/TourHost";
import { Disclaimer } from "@/components/features/Disclaimer";
import { DashboardMarket } from "@/components/features/market/DashboardMarket";
import { SearchBar } from "@/components/features/market/SearchBar";
import { redirect, Link } from "@/i18n/navigation";
import { greetingSlotFor, tipIndexFor } from "@/lib/dashboard";
import { asFomoBand } from "@/lib/fomo-bands";
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

  const band = asFomoBand(profile.band);
  const score = profile.fomoScore;

  const greeting = t(`greeting.${greetingSlotFor(new Date().getHours())}`);
  const tipNumber = tipIndexFor() + 1;

  let feed: TrendingFeed | null = null;
  try {
    feed = await getTrending();
  } catch {
    feed = null;
  }

  return (
    <Container className="py-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {greeting}
          </h1>
          <p className="mt-1 text-sm text-white/50">{t("subtitle")}</p>
        </div>
        <GuideButton />
      </div>
      <div data-tour="dashboard-search">
        <SearchBar className="mt-4" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <aside className="space-y-4 lg:order-2 lg:sticky lg:top-20 lg:self-start">
          <div data-tour="dashboard-fomo">
            <DashboardFomoCard score={score} band={band} />
          </div>

          <DashboardActions />

          <Link
            href="/safety/scan"
            className="group flex items-start gap-3 rounded-3xl border border-rose-500/25 bg-rose-500/5 p-4 transition-colors hover:border-rose-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ShieldAlert
              className="mt-0.5 size-5 shrink-0 text-rose-300"
              aria-hidden
            />
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{t("checkSources.title")}</span>
              <span className="text-sm leading-relaxed text-white/50">
                {t("checkSources.body")}
              </span>
            </span>
          </Link>
        </aside>

        <div className="min-w-0 lg:order-1 lg:col-span-2">
          <DashboardMarket
            initial={feed}
            watchlistSymbols={symbols.map((row) => row.symbol)}
            tipNumber={tipNumber}
          />
        </div>
      </div>

      <Disclaimer className="mt-8" />
    </Container>
  );
}
