import { SearchX, WifiOff } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { Disclaimer } from "@/components/features/Disclaimer";
import { SearchBar } from "@/components/features/market/SearchBar";
import { RetryButton } from "@/components/features/stock/RetryButton";
import { StockView } from "@/components/features/stock/StockView";
import { buttonVariants } from "@/components/ui/Button";
import { getStockDetail, type StockDetail } from "@/lib/market";
import { MarketError } from "@/lib/market/yahoo";
import { getVisitorId } from "@/lib/visitor";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const SYMBOL_RE = /^[A-Z0-9&-]{1,20}$/;

interface StockPageParams {
  locale: string;
  symbol: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<StockPageParams>;
}) {
  const { locale, symbol } = await params;
  const t = await getTranslations({ locale, namespace: "stock" });
  return {
    title: t("metaTitle", { symbol: symbol.toUpperCase() }),
  };
}

export default async function StockPage({
  params,
}: {
  params: Promise<StockPageParams>;
}) {
  const { locale, symbol } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "stock" });
  const upper = symbol.toUpperCase();

  let detail: StockDetail | null = null;
  let upstreamFailed = false;

  if (SYMBOL_RE.test(upper)) {
    try {
      detail = await getStockDetail(upper, "1M");
    } catch (error) {
      if (error instanceof MarketError && error.kind === "not_found") {
        detail = null;
      } else {
        upstreamFailed = true;
      }
    }
  }

  if (!detail) {
    if (upstreamFailed) {
      return (
        <div className="mx-auto w-full max-w-2xl px-4 py-12 text-center">
          <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-8">
            <WifiOff className="mx-auto size-9 text-white/30" aria-hidden />
            <h1 className="mt-3 text-xl font-bold tracking-tight">
              {t("unavailable.title")}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              {t("unavailable.body")}
            </p>
            <div className="mt-5 flex justify-center">
              <RetryButton />
            </div>
          </div>
          <Disclaimer className="mt-8" />
        </div>
      );
    }

    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12 text-center">
        <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-8">
          <SearchX className="mx-auto size-9 text-white/30" aria-hidden />
          <h1 className="mt-3 text-xl font-bold tracking-tight">
            {t("notFound.title")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            {t("notFound.body")}
          </p>
          <SearchBar className="mt-6 text-left" />
          <Link
            href="/markets"
            className={cn(buttonVariants({ variant: "ghost" }), "mt-5")}
          >
            {t("notFound.back")}
          </Link>
        </div>
        <Disclaimer className="mt-8" />
      </div>
    );
  }

  let initialWatched = false;
  try {
    const visitorId = await getVisitorId();
    if (visitorId) {
      const rows = await db
        .select({ symbol: watchlist.symbol })
        .from(watchlist)
        .where(
          and(eq(watchlist.visitorId, visitorId), eq(watchlist.symbol, upper))
        )
        .limit(1);
      initialWatched = rows.length > 0;
    }
  } catch {
    initialWatched = false;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-36 pt-6 md:pb-28 md:pt-8">
      <StockView initial={detail} initialWatched={initialWatched} />
      <Disclaimer className="mt-8" />
    </div>
  );
}
