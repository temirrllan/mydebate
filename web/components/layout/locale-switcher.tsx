"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { LOCALES, LOCALE_LABEL, LOCALE_SHORT_LABEL, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Переключатель языка — три настоящие ссылки, а не выпадающий список с
 * router.push. Так выбор языка работает без JS, открывается в новой вкладке
 * средним кликом и, главное, даёт поисковику обойти все три версии страницы:
 * с кнопками на onClick он увидел бы только текущую.
 *
 * usePathname из i18n/navigation отдаёт путь БЕЗ префикса локали, поэтому
 * ссылка ведёт на ту же страницу на другом языке, а не на главную.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("locale");
  const active = useLocale() as Locale;
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Фильтры каталога живут в query-параметрах. Без них переключение языка на
  // странице «Турниры» сбрасывало бы подобранную выдачу к списку с нуля.
  const query = searchParams.toString();
  const href = query ? `${pathname}?${query}` : pathname;

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role="group"
      aria-label={t("label")}
    >
      {LOCALES.map((locale) => {
        const current = locale === active;
        return (
          <Link
            key={locale}
            href={href}
            locale={locale}
            hrefLang={locale}
            aria-current={current ? "true" : undefined}
            aria-label={current ? undefined : t("switchTo", { language: LOCALE_LABEL[locale] })}
            className={cn(
              "rounded-md px-1.5 py-1 text-xs font-semibold uppercase transition-colors",
              current
                ? "bg-brand-50 text-brand-700"
                : "text-slate-500 hover:bg-canvas hover:text-ink",
            )}
          >
            {LOCALE_SHORT_LABEL[locale]}
          </Link>
        );
      })}
    </div>
  );
}
