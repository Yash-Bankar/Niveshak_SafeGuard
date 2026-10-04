import { ChevronRight, ShieldCheck, User } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Disclaimer } from "@/components/features/Disclaimer";
import { LanguageCards } from "@/components/features/language/LanguageCards";
import { PortfolioCard } from "@/components/features/portfolio/PortfolioCard";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("profile");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 md:py-10">
      <header className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex size-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-neutral-900/90"
        >
          <User className="size-7 text-white/50" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-white/50">{t("anonymousNote")}</p>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
          {t("languageTitle")}
        </h2>
        <LanguageCards stay />
      </section>

      <section className="mt-8">
        <Link
          href="/fomo-quiz"
          className="group flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-neutral-900/90 p-5 transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span className="flex flex-col gap-1">
            <span className="font-semibold">{t("fomoTitle")}</span>
            <span className="text-sm text-white/50">{t("fomoBody")}</span>
          </span>
          <ChevronRight
            aria-hidden
            className="size-5 shrink-0 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60"
          />
        </Link>
      </section>

      <section className="mt-6">
        <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden className="size-[18px] text-blue-400" />
            <h2 className="font-semibold">{t("privacyTitle")}</h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            {t("privacyBody")}
          </p>
        </div>
      </section>

      <PortfolioCard />

      <Disclaimer className="mt-8" />
    </div>
  );
}
