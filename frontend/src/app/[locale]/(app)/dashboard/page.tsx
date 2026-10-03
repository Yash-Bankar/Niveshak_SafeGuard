import { count, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import {
  chatMessages,
  fomoProfiles,
  safetyAttempts,
  watchlist,
} from "@/db/schema";
import { getVisitorId } from "@/lib/visitor";

// Throwaway verification page (Phase 3/4 checklists) — replaced in Phase 5.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const t = await getTranslations("common.check");

  const visitorId = await getVisitorId();

  if (!visitorId) {
    return (
      <main className="mx-auto max-w-2xl p-10">
        <h1 className="text-2xl font-bold">{t("noVisitor")}</h1>
        <p className="mt-2 text-white/60">{t("noVisitorBody")}</p>
      </main>
    );
  }

  const short = visitorId.slice(0, 8);

  const countFor = async (
    table:
      | typeof fomoProfiles
      | typeof safetyAttempts
      | typeof watchlist
      | typeof chatMessages
  ): Promise<number> => {
    const rows = await db
      .select({ value: count() })
      .from(table)
      .where(eq(table.visitorId, visitorId));
    return rows[0]?.value ?? 0;
  };

  const [fomo, attempts, watch, chat] = await Promise.all([
    countFor(fomoProfiles),
    countFor(safetyAttempts),
    countFor(watchlist),
    countFor(chatMessages),
  ]);

  return (
    <main className="mx-auto max-w-2xl p-10 font-mono">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="mt-4">
        {t("visitorId")}: <span className="text-blue-400">{short}</span>
      </p>
      <h2 className="mt-6 text-sm uppercase tracking-widest text-white/40">
        {t("rows")}
      </h2>
      <ul className="mt-3 space-y-2 text-sm">
        <li>fomo_profiles: {fomo}</li>
        <li>safety_attempts: {attempts}</li>
        <li>watchlist: {watch}</li>
        <li>chat_messages: {chat}</li>
      </ul>
      <p className="mt-6 text-xs text-white/50">{t("privacyNote")}</p>
    </main>
  );
}
