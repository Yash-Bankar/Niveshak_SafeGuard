import { Bot, Gauge, ShieldAlert } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HeroVisual } from "@/components/features/landing/HeroVisual";
import { LandingHeader } from "@/components/features/landing/LandingHeader";
import { Reveal } from "@/components/features/landing/Reveal";
import { StartCta } from "@/components/features/landing/StartCta";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  return (
    <div className="flex min-h-full flex-col">
      <LandingHeader />

      <main className="flex-1">
        {/* ---------------- Hero ---------------- */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-2">
            <div className="flex flex-col items-start gap-6">
              <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                {t("hero.headline")}
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-white/60">
                {t("hero.sub")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StartCta />
                <a
                  href="#how-it-works"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-neutral-900/90 px-8 text-base font-medium text-white hover:border-white/20 hover:bg-neutral-800/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {tc("howItWorks")}
                </a>
              </div>
            </div>
            <HeroVisual />
          </div>
        </section>

        {/* ---------------- Features ---------------- */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight">
              {t("features.title")}
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {(
              [
                { icon: Bot, title: t("features.educator.title"), body: t("features.educator.body") },
                { icon: Gauge, title: t("features.fomo.title"), body: t("features.fomo.body") },
                { icon: ShieldAlert, title: t("features.scanner.title"), body: t("features.scanner.body") },
              ] as const
            ).map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.08}>
                <div className="glass h-full rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-primary">
                    <feature.icon className="size-6 text-white" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">
                    {feature.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------------- How it works ---------------- */}
        <section
          id="how-it-works"
          className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 md:px-6 md:py-24"
        >
          <Reveal>
            <h2 className="text-center text-3xl font-bold tracking-tight">
              {t("how.title")}
            </h2>
          </Reveal>
          <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
            {/* connecting line (desktop) */}
            <div
              aria-hidden
              className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-blue-600/40 via-indigo-500/40 to-purple-500/40 md:block"
            />
            {(["1", "2", "3", "4"] as const).map((n, i) => (
              <Reveal key={n} delay={i * 0.08}>
                <li className="relative flex flex-col items-center gap-4 text-center md:items-start md:text-left">
                  <span className="z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-primary font-mono text-base font-semibold tabular-nums shadow-lg">
                    {n}
                  </span>
                  <h3 className="text-lg font-semibold">
                    {t(`how.steps.${n}.title`)}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/60">
                    {t(`how.steps.${n}.body`)}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ---------------- Trust strip ---------------- */}
        <section className="border-y border-white/10 bg-white/[0.02]">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center md:px-6">
            <Reveal className="flex flex-wrap items-center justify-center gap-3">
              {(
                [
                  t("trust.educational"),
                  t("trust.noTrading"),
                  t("trust.noScreenshots"),
                ] as const
              ).map((item, i) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-3 text-sm font-medium text-white/70"
                >
                  {i > 0 && <span className="text-blue-400/60" aria-hidden>•</span>}
                  {item}
                </span>
              ))}
            </Reveal>
            <Reveal delay={0.1}>
              <p className="text-xs uppercase tracking-widest text-white/30">
                {t("trust.sebi")}
              </p>
            </Reveal>
          </div>
        </section>

        {/* ---------------- Final CTA ---------------- */}
        <section className="mx-auto w-full max-w-3xl px-4 py-20 text-center md:px-6 md:py-28">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              {t("finalCta.title")}
            </h2>
            <p className="mt-4 text-white/60">{t("finalCta.body")}</p>
            <div className="mt-8 flex justify-center">
              <StartCta />
            </div>
          </Reveal>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-white/10 bg-black/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center md:px-6">
          <p className="text-sm text-white/50">{t("footer.disclaimer")}</p>
        </div>
      </footer>
    </div>
  );
}
