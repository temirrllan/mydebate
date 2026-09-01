// hreflang для страницы: список её адресов на всех языках.
//
// Без этого блока поисковик видит /tournaments, /kk/tournaments и
// /en/tournaments как три разные страницы с похожим содержимым и решает, что
// это дубли: в выдачу попадает одна, остальные отбрасываются. hreflang
// объясняет, что это один документ на трёх языках, и каждому пользователю
// показывается версия на его языке.
import { SEARCH_INDEXED_LOCALES, routing, type Locale } from "@/i18n/routing";

/**
 * Адрес страницы в заданной локали с учётом localePrefix: "as-needed" —
 * у языка по умолчанию (русского) префикса нет.
 *
 * @param pathname путь БЕЗ префикса локали, начинающийся со слэша ("/tournaments").
 */
export function localePath(locale: Locale, pathname: string): string {
  const path = pathname === "/" ? "" : pathname;
  return locale === routing.defaultLocale ? path || "/" : `/${locale}${path}`;
}

/**
 * Готовый блок `alternates` для Metadata. Относительные пути допустимы —
 * абсолютными их делает metadataBase из корневого layout.
 *
 * `x-default` — версия для тех, чей язык не совпал ни с одним из наших;
 * указываем на русскую как на основную.
 */
export function localeAlternates(pathname: string, currentLocale: Locale) {
  const canonical = localePath(currentLocale, pathname);

  // hreflang перечисляет только те языки, которые открыты поисковику
  // (SEARCH_INDEXED_LOCALES). Указывать в нём версию, закрытую noindex, —
  // противоречие: мы одновременно зовём робота на страницу и запрещаем её
  // индексировать. Пока язык один, связка hreflang не нужна вовсе.
  if (SEARCH_INDEXED_LOCALES.length < 2) return { canonical };

  const languages: Record<string, string> = {};
  for (const locale of SEARCH_INDEXED_LOCALES) {
    languages[locale] = localePath(locale, pathname);
  }
  languages["x-default"] = localePath(routing.defaultLocale, pathname);

  return { canonical, languages };
}
