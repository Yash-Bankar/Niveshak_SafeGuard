import { getTranslations, setRequestLocale } from "next-intl/server";
import { Disclaimer } from "@/components/features/Disclaimer";
import { StandaloneScan } from "@/components/features/safety/StandaloneScan";
import { Container } from "@/components/ui/Container";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "safety" });
  return { title: t("scanStandalone.title") };
}

export default async function ScanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Container size="narrow" className="py-6 md:py-8">
      <StandaloneScan />
      <Disclaimer className="mt-8 text-center" />
    </Container>
  );
}
