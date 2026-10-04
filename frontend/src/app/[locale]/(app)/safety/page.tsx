import { History, Plus, Search } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Disclaimer } from "@/components/features/Disclaimer";
import { StockLogo } from "@/components/features/market/StockLogo";
import { formatDate } from "@/lib/format";
import { listAttempts, type AttemptSummary } from "@/lib/safety";
import { getVisitorId } from "@/lib/visitor";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

function verdictVariant(
  verdict: string
): "positive" | "warning" | "negative" {
  if (verdict === "INFORMED") return "positive";
  if (verdict === "SPECULATIVE") return "negative";
  return "warning";
}

/** Safety history (Phase 7: minimal quiz-attempt list). */
export default async function SafetyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const visitorId = await getVisitorId();
  if (!visitorId) throw redirect({ href: "/", locale });

  let attempts: AttemptSummary[] = [];
  try {
    attempts = await listAttempts(visitorId, 20);
  } catch {
    attempts = [];
  }

  const t = await getTranslations("safety");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-white/50">{t("subtitle")}</p>
      </div>

      <h2 className="mt-8 text-xs font-medium uppercase tracking-wider text-white/40">
        {t("historyTitle")}
      </h2>

      {attempts.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-white/15 px-6 py-12 text-center">
          <History aria-hidden className="size-7 text-white/30" />
          <p className="max-w-sm text-sm text-white/50">{t("emptyHistory")}</p>
          <Link href="/markets" className={buttonVariants({ variant: "secondary" })}>
            <Search className="size-4" aria-hidden />
            {t("history.emptyCta")}
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <Link
                href={{
                  pathname: `/safety-quiz/${attempt.ticker}/result`,
                  query: { attempt: attempt.id },
                }}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <StockLogo symbol={attempt.ticker} className="size-10 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-semibold text-white/90">
                    {attempt.ticker}
                  </p>
                  <p className="mt-0.5 text-xs text-white/50">
                    {formatDate(attempt.createdAt, locale)}
                  </p>
                </div>
                <Badge variant={verdictVariant(attempt.verdict)}>
                  {t(`verdict.${attempt.verdict}.title`)}
                </Badge>
                <span className="font-mono text-sm tabular-nums text-white/80">
                  {attempt.score}/{attempt.total}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <Link
          href="/markets"
          className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
        >
          <Plus className="size-4" aria-hidden />
          {t("history.newCheck")}
        </Link>
      </div>

      <Disclaimer className="mt-8" />
    </div>
  );
}
