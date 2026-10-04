"use client";

import { AlertTriangle, Check, GraduationCap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

/** Section — the categories the visitor got right (API `strengths`). */
export function StrengthsCard({ strengths }: { strengths: string[] }) {
  const t = useTranslations("safety.result");
  const reduce = useReducedMotion();
  if (strengths.length === 0) return null;
  return (
    <section className="rounded-3xl border border-emerald-400/25 bg-emerald-500/5 p-5">
      <h2 className="text-sm font-semibold text-white/90">
        {t("strengthsTitle")}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {strengths.map((item, index) => (
          <motion.li
            key={item}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : index * 0.05 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-200"
          >
            <Check className="size-3.5" aria-hidden />
            {item}
          </motion.li>
        ))}
      </ul>
    </section>
  );
}

export interface Gap {
  category: string;
  what_to_learn: string[];
}

/** Section — the weak areas + what to learn (API `gaps`). */
export function GapsCard({ gaps }: { gaps: Gap[] }) {
  const t = useTranslations("safety.result");
  if (gaps.length === 0) return null;
  return (
    <section className="rounded-3xl border border-amber-400/25 bg-amber-500/5 p-5">
      <h2 className="text-sm font-semibold text-white/90">{t("gapsTitle")}</h2>
      <ul className="mt-3 space-y-3">
        {gaps.map((gap) => (
          <li
            key={gap.category}
            className="rounded-2xl border border-white/10 bg-white/5 p-3"
          >
            <p className="flex items-center gap-2 text-sm font-medium text-white/90">
              <AlertTriangle className="size-4 shrink-0 text-amber-400" aria-hidden />
              {gap.category}
            </p>
            {gap.what_to_learn.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {gap.what_to_learn.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm leading-relaxed text-white/65"
                  >
                    <GraduationCap
                      className="mt-0.5 size-3.5 shrink-0 text-blue-300"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface Feedback {
  category: string;
  question: string;
  explanation: string;
}

/** Section — per-question explanation only (no right/wrong). */
export function FeedbackReview({ feedback }: { feedback: Feedback[] }) {
  const t = useTranslations("safety.result");
  if (feedback.length === 0) return null;
  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
      <h2 className="text-sm font-semibold text-white/90">{t("review")}</h2>
      <ol className="mt-4 space-y-4">
        {feedback.map((item, index) => (
          <li
            key={index}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            {item.category ? (
              <span className="inline-flex rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-medium text-blue-200">
                {item.category}
              </span>
            ) : null}
            {item.question ? (
              <p className="mt-2 text-sm font-medium leading-relaxed text-white/90">
                {item.question}
              </p>
            ) : null}
            {item.explanation ? (
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                {item.explanation}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
