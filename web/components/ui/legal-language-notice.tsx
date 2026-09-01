import { getLocale, getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";

/**
 * Пометка на юридических страницах (условия использования, политика
 * конфиденциальности), что текст ниже — на русском.
 *
 * Эти документы намеренно НЕ переводятся: юридическую силу имеет одна
 * редакция, а перевод создаёт вторую, расходящуюся с ней. Но и молча
 * показывать русский текст казахоязычному посетителю нельзя — он решит, что
 * страница сломалась. Отсюда явная пометка.
 *
 * На русской версии ничего не рисуем: там объяснять нечего.
 */
export async function LegalLanguageNotice() {
  const locale = await getLocale();
  if (locale === routing.defaultLocale) return null;

  const t = await getTranslations("legal");

  return (
    <p className="mb-6 rounded-lg border border-line bg-canvas px-4 py-3 text-sm text-muted">
      {t("onlyRussian")}
    </p>
  );
}
