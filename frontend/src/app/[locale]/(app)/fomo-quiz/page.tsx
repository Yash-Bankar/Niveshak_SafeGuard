import { eq } from "drizzle-orm";
import { setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { fomoProfiles } from "@/db/schema";
import { FomoQuiz } from "@/components/features/fomo/FomoQuiz";
import { redirect } from "@/i18n/navigation";
import { publicFomoQuestions } from "@/lib/fomo";
import { getVisitorId } from "@/lib/visitor";

export const dynamic = "force-dynamic";

/**
 * First-run gate target: visitors WITHOUT a FOMO profile answer the 6
 * questions here; visitors who already have one bounce straight back to the
 * dashboard (no skip, no anonymous play — see PRD B8 / locked decisions).
 */
export default async function FomoQuizPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const visitorId = await getVisitorId();
  if (!visitorId) throw redirect({ href: "/", locale });

  const existing = await db
    .select({ id: fomoProfiles.id })
    .from(fomoProfiles)
    .where(eq(fomoProfiles.visitorId, visitorId))
    .limit(1);
  if (existing[0]) throw redirect({ href: "/dashboard", locale });

  return <FomoQuiz questions={publicFomoQuestions()} />;
}
