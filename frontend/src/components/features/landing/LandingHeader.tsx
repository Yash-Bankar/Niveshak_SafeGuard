import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/features/landing/LocaleSwitcher";
import { StartCta } from "@/components/features/landing/StartCta";
import { HeaderShell } from "@/components/features/shell/HeaderShell";

/**
 * Sticky glass top bar for the public landing page. Uses the shared
 * HeaderShell so it matches the app's TopBar exactly; only the right-hand
 * actions differ (language control + Get started).
 */
export function LandingHeader() {
  const t = useTranslations("common");

  const right = (
    <>
      <LocaleSwitcher className="hidden sm:flex" />
      <StartCta size="sm" />
    </>
  );

  return <HeaderShell homeHref="/" label={t("appName")} right={right} />;
}
