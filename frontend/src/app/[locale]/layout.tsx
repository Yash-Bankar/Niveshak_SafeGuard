import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import {
  Inter,
  JetBrains_Mono,
  Noto_Sans_Devanagari,
} from "next/font/google";
import { isLocale, LOCALES } from "@/i18n/routing";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari", "latin"],
});

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const safe = isLocale(locale) ? locale : "en";
  const t = await getTranslations({ locale: safe, namespace: "landing" });

  return {
    title: {
      default: "Niveshak SafeGuard",
      template: "%s · Niveshak SafeGuard",
    },
    description: t("meta.description"),
    icons: { icon: "/logo.svg" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate the locale param — unknown locales get a 404.
  if (!isLocale(locale)) notFound();

  // Enables static rendering for all pages below this layout.
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`dark h-full antialiased ${inter.variable} ${jetbrainsMono.variable} ${devanagari.variable}`}
    >
      <body className="min-h-full flex flex-col bg-page text-white">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
