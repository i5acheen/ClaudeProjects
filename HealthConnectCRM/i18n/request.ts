import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const LOCALES = ["en", "mr"] as const;
export type Locale = (typeof LOCALES)[number];

export default getRequestConfig(async () => {
  const fromCookie = (await cookies()).get("locale")?.value;
  const accept = (await headers()).get("accept-language") ?? "";
  const locale: Locale = fromCookie === "mr" || fromCookie === "en" ? fromCookie : accept.startsWith("mr") ? "mr" : "en";
  return { locale, messages: (await import(`../messages/${locale}.json`)).default };
});
