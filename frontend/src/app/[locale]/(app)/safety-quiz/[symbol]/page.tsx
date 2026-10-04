import { SearchX } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Disclaimer } from "@/components/features/Disclaimer";
import { SafetyQuizFlow } from "@/components/features/safety/SafetyQuizFlow";
import { buttonVariants } from "@/components/ui/Button";
import { FALLBACK_QUIZ_STOCKS, matchQuizStock } from "@/lib/safety";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const SYMBOL_RE = /^[A-Z0-9&-]{1,20}$/;

interface QuizPageParams {
  locale: string;
  symbol: string;
}

export async function generateMetadata({ params }: { params: Promise<QuizPageParams> }) {
  const { locale, symbol } = await params;
  const t = await getTranslations({ locale, namespace: "safety" });
  return { title: t("quiz.metaTitle", { symbol: symbol.toUpperCase() }) };
}

export default async function SafetyQuizPage({
  params,
}: {
  params: Promise<QuizPageParams>;
}) {
  const { locale, symbol } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "safety" });
  const upper = symbol.toUpperCase();
  const stockName =
    SYMBOL_RE.test(upper) ? matchQuizStock(upper) : null;

  if (!stockName) {
    // The backend v2 API has no supported-stock list endpoint — the chips
    // come from the static table in lib/safety.ts.
    const chips: { symbol: string; display: string }[] = FALLBACK_QUIZ_STOCKS.map(
      (symbol) => ({ symbol, display: symbol })
    );

    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12 text-center">
        <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-8">
          <SearchX className="mx-auto size-9 text-white/30" aria-hidden />
          <h1 className="mt-3 text-xl font-bold tracking-tight">
            {t("quiz.unsupported.title")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            {t("quiz.unsupported.body")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {chips.map(({ symbol, display }) => (
              <Link
                key={symbol}
                href={`/safety-quiz/${symbol}`}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-sm text-white/80 transition-colors hover:border-white/30 hover:text-white"
              >
                {display}
              </Link>
            ))}
          </div>
          <Link
            href="/markets"
            className={cn(buttonVariants({ variant: "ghost" }), "mt-6")}
          >
            {t("quiz.unsupported.browse")}
          </Link>
        </div>
        <Disclaimer className="mt-8 text-center" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-8">
      <SafetyQuizFlow stock={upper} stockName={stockName} />
    </div>
  );
}
