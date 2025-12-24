import en from "./en.json";
import de from "./de.json";

/**
 * Supported locales in the shop
 * Add more here when needed
 */
export type SupportedLocale = "en" | "de";

/**
 * Translation dictionary
 */
export const translations: Record<SupportedLocale, any> = {
  en,
  de,
};

/**
 * Translate helper
 *
 * @param locale - shop language (en, de, ...)
 * @param key - dot notation key (payment.transactionId)
 * @param params - dynamic placeholders
 */
export function t(
  locale: SupportedLocale,
  key: string,
  params: Record<string, string> = {}
): string {
  const dict = translations[locale] ?? translations.en;

  let text =
    key
      .split(".")
      .reduce<any>(
        (obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined),
        dict
      ) ?? key;

  Object.entries(params).forEach(([k, v]) => {
    text = text.replace(new RegExp(`{{${k}}}`, "g"), v);
  });

  return text;
}
