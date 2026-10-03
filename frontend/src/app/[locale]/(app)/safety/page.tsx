import { History } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/features/shell/PlaceholderPage";

export default async function SafetyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("safety");
  const tc = await getTranslations("common");

  return (
    <PlaceholderPage
      title={t("title")}
      subtitle={t("subtitle")}
      badge={tc("comingSoon")}
    >
      <h2 className="text-xs font-medium uppercase tracking-wider text-white/40">
        {t("historyTitle")}
      </h2>
      <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center">
        <History aria-hidden className="size-6 text-white/30" />
        <p className="max-w-sm text-sm text-white/50">{t("emptyHistory")}</p>
      </div>
    </PlaceholderPage>
  );
}
