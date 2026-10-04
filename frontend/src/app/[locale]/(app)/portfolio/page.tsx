import { getTranslations, setRequestLocale } from "next-intl/server";
import { Disclaimer } from "@/components/features/Disclaimer";
import { PortfolioCard } from "@/components/features/portfolio/PortfolioCard";
import { Container } from "@/components/ui/Container";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "portfolio" });
  return { title: t("pageTitle") };
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("portfolio");

  return (
    <Container size="default" className="py-8 md:py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("pageTitle")}
        </h1>
        <p className="mt-1 text-sm text-white/50">{t("pageSubtitle")}</p>
      </div>
      <div className="mt-6">
        <PortfolioCard />
      </div>
      <Disclaimer className="mt-8" />
    </Container>
  );
}
