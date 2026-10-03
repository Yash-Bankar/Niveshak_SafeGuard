import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-bold">{t("notFound.title")}</h1>
      <p className="text-white/60">{t("notFound.body")}</p>
      <Link
        href="/"
        className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-gradient-primary px-6 text-sm font-medium text-white hover:opacity-90"
      >
        {t("notFound.home")}
      </Link>
    </main>
  );
}
