import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/features/landing/LocaleSwitcher";
import { StartCta } from "@/components/features/landing/StartCta";

/** Sticky glass top bar for the public landing page. */
export function LandingHeader() {
  const t = useTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={t("appName")}
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-primary">
            <Image
              src="/logo.svg"
              alt=""
              width={26}
              height={26}
              unoptimized
              aria-hidden
            />
          </span>
          <span className="text-base font-semibold tracking-tight">
            {t("appName")}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <LocaleSwitcher className="hidden sm:flex" />
          <StartCta size="sm" />
        </div>
      </div>
    </header>
  );
}
