"use client";

import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useFaqQuery } from "./faq-provider";

/** Мгновенный (без перезагрузки) поиск по FAQ — фильтрует список ниже по странице. */
export function FaqSearchInput() {
  const t = useTranslations("help");
  const { query, setQuery } = useFaqQuery();

  return (
    <label className="relative block max-w-md">
      <span className="sr-only">{t("searchLabel")}</span>
      <Search
        size={18}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="h-12 w-full rounded-[var(--radius-btn)] border border-line bg-white pl-11 pr-4 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
      />
    </label>
  );
}
