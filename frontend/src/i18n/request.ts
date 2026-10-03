import { getRequestConfig } from "next-intl/server";
import { isLocale, routing } from "./routing";

const messages = {
  en: () => import("../messages/en.json").then((m) => m.default),
  hi: () => import("../messages/hi.json").then((m) => m.default),
  mr: () => import("../messages/mr.json").then((m) => m.default),
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: await messages[locale](),
  };
});
