import type { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { AssistantBubble } from "@/components/features/shell/AssistantBubble";
import { BottomDock } from "@/components/features/shell/BottomDock";
import { TopBar } from "@/components/features/shell/TopBar";

/**
 * Authenticated-feel app shell: sticky TopBar, page content with room for
 * the mobile BottomDock, and the global AssistantBubble mount point.
 * (The first-run select-language page lives in (public) so it stays bare.)
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (isLocale(locale)) setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <BottomDock />
      <AssistantBubble />
    </div>
  );
}
