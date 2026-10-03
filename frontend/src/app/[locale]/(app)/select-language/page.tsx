import { getTranslations, setRequestLocale } from "next-intl/server";
import { LanguageCards } from "@/components/features/language/LanguageCards";

export default async function SelectLanguagePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("language");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-10 px-4 py-16 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {t("title")}
        </h1>
        <p className="text-white/60">{t("subtitle")}</p>
      </div>
      <LanguageCards />
    </main>
  );
}
