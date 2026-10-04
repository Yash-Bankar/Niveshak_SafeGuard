import { ShieldX } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AttemptResult } from "@/components/features/safety/AttemptResult";
import { Disclaimer } from "@/components/features/Disclaimer";
import { buttonVariants } from "@/components/ui/Button";
import { getAttempt } from "@/lib/safety";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";

interface ResultPageParams {
  locale: string;
  symbol: string;
}

export async function generateMetadata({ params }: { params: Promise<ResultPageParams> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "safety" });
  return { title: t("result.metaTitle") };
}

/**
 * The result page survives refresh: data comes from Neon (the attempt row),
 * scoped to the current visitor — invalid or foreign attempt ids get a
 * friendly not-found. Question review is hydrated from the flow store when
 * this device still has it.
 */
export default async function SafetyResultPage({
  params,
  searchParams,
}: {
  params: Promise<ResultPageParams>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { locale } = await params;
  const { attempt: attemptId } = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "safety" });
  const visitorId = await getVisitorId();

  const attempt =
    visitorId && attemptId ? await getAttempt(attemptId, visitorId) : null;

  if (!attempt) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-12 text-center">
        <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-8">
          <ShieldX className="mx-auto size-9 text-white/30" aria-hidden />
          <h1 className="mt-3 text-xl font-bold tracking-tight">
            {t("result.notFound.title")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            {t("result.notFound.body")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/markets" className={buttonVariants()}>
              {t("result.notFound.browse")}
            </Link>
            <Link
              href="/dashboard"
              className={buttonVariants({ variant: "ghost" })}
            >
              {t("result.dashboard")}
            </Link>
          </div>
        </div>
        <Disclaimer className="mt-8 text-center" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:py-8">
      <AttemptResult attempt={attempt} />
    </div>
  );
}
