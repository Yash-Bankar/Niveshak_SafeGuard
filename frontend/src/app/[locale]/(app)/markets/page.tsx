import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Disclaimer } from "@/components/features/Disclaimer";
import { IndicesStrip } from "@/components/features/market/IndicesStrip";
import { MarketRetry } from "@/components/features/market/MarketRetry";
import { MoversSection } from "@/components/features/market/MoversSection";
import { SearchBar } from "@/components/features/market/SearchBar";
import { getTrending, type TrendingFeed } from "@/lib/market";

export const dynamic = "force-dynamic";

export default async function MarketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("market");

  let feed: TrendingFeed | null = null;
  try {
    feed = await getTrending();
  } catch {
    feed = null;
  }

  const updated = feed
    ? new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(feed.updated_at))
    : "";

  return (
    <Container className="py-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-white/50">{t("subtitle")}</p>
        </div>
        {feed ? (
          <Badge variant={feed.market_open ? "positive" : "neutral"}>
            {feed.market_open ? t("open") : t("closed")}
          </Badge>
        ) : null}
      </div>

      <div data-tour="markets-search">
        <SearchBar className="mt-5" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <aside className="lg:order-2 lg:sticky lg:top-20 lg:self-start">
          <Card data-tour="markets-indices" className="p-4 sm:p-5">
            <IndicesStrip initial={feed?.indices ?? null} />
            {feed ? (
              <p className="mt-3 text-xs text-white/40">
                {t("updated", { time: updated })}
              </p>
            ) : null}
          </Card>
        </aside>

        <div className="min-w-0 lg:order-1 lg:col-span-2">
          <Card data-tour="markets-movers" className="p-4 sm:p-5">
            {feed ? (
              <MoversSection
                gainers={feed.gainers}
                losers={feed.losers}
                most_active={feed.most_active}
              />
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-white/50">{t("unavailable")}</p>
                <MarketRetry className="mt-4" />
              </div>
            )}
          </Card>
        </div>
      </div>

      <Disclaimer className="mt-8" />
    </Container>
  );
}
