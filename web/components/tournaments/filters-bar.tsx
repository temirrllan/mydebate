"use client";

import { useRef, useState, useTransition } from "react";
// usePathname/useRouter здесь ИЗ next/navigation, а не из i18n/navigation, и
// это осознанно: путь берётся и возвращается вместе с префиксом локали, то
// есть на /kk/tournaments router.replace получит /kk/tournaments — префикс не
// теряется. Обёртки i18n тут ничего не добавили бы.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, RotateCcw, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TournamentFormat, LocationType, Level } from "@/lib/enums";
import { cn } from "@/lib/utils";

/** Ключи фильтров, участвующие в чипах «активные фильтры» и в счётчике. */
const FILTER_KEYS = ["search", "format", "locationType", "city", "date", "level"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

/** Ключ подписи фильтра в словаре (namespace "filters"). */
const FILTER_TITLE_KEY: Record<FilterKey, string> = {
  search: "chipSearch",
  format: "format",
  locationType: "chipType",
  city: "city",
  date: "chipDate",
  level: "level",
};

/**
 * Панель фильтров каталога турниров — живой поиск (дебаунс) + селекты,
 * отражаются в URL query (`router.replace`, без полной перезагрузки страницы).
 * Сама панель не хранит результаты — просто управляет query, `/tournaments`
 * (Server Component) читает `searchParams` заново при каждом изменении URL.
 */
export function FiltersBar({ cities }: { cities: string[] }) {
  const t = useTranslations("filters");
  // Подписи значений (Дебаты / Онлайн / Beginner) живут в отдельном
  // namespace: те же строки нужны карточке, странице турнира и выгрузке.
  const tEnum = useTranslations("enums");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(urlSearch);
  // Отслеживаем последнее значение search, пришедшее ИЗ URL — если оно
  // изменилось не из-за нашего же дебаунса (кнопка "Сбросить", переход по
  // прямой ссылке), синхронизируем локальное поле. Правки состояния "во время
  // рендера" (а не в useEffect) — рекомендованный React-паттерн для сброса
  // состояния при изменении внешнего пропа/источника, без лишнего рендера.
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(urlSearch);
  if (urlSearch !== syncedUrlSearch) {
    setSyncedUrlSearch(urlSearch);
    setSearch(urlSearch);
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateParams(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page"); // сброс пагинации при смене фильтра
    startTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, {
        scroll: false,
      });
    });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParams({ search: value }), 400);
  }

  function handleReset() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearch("");
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  function removeFilter(key: FilterKey) {
    if (key === "search") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSearch("");
    }
    updateParams({ [key]: "" });
  }

  /** Человеческая подпись значения фильтра для чипа. */
  function chipLabel(key: FilterKey, value: string): string {
    if (key === "format") return tEnum(`format.${value}`);
    if (key === "locationType") return tEnum(`locationType.${value}`);
    if (key === "level") return tEnum(`level.${value}`);
    if (key === "date") {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      return m ? `${m[3]}.${m[2]}.${m[1]}` : value;
    }
    return value;
  }

  const activeFilters = FILTER_KEYS.map((key) => ({ key, value: searchParams.get(key) ?? "" })).filter(
    (f) => f.value !== "",
  );
  const activeCount = activeFilters.length;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition-opacity",
        isPending && "opacity-70",
      )}
    >
      {/* Шапка панели: иконка, заголовок, счётчик активных фильтров, сброс */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas px-5 py-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          <SlidersHorizontal size={16} className="text-brand-600" aria-hidden="true" />
          {t("title")}
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <ArrowUpDown size={14} aria-hidden="true" /> {t("sort")}
          </label>
          <Select
            id="sort-select"
            wrapperClassName="w-48"
            className="h-9"
            value={searchParams.get("sort") ?? "nearest"}
            onChange={(e) => updateParams({ sort: e.target.value })}
          >
            <option value="nearest">{t("sortNearest")}</option>
            <option value="newest">{t("sortNewest")}</option>
          </Select>
        </div>
      </div>

      <div className="p-5">
        {/* Поиск — во всю ширину, это основной способ найти турнир */}
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            id="tournament-search"
            type="search"
            aria-label={t("searchLabel")}
            placeholder={t("searchPlaceholder")}
            className="h-12 pl-11"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div>
            <label htmlFor="format-filter" className="text-xs font-medium text-muted">
              {t("format")}
            </label>
            <div className="mt-1.5">
              <Select
                id="format-filter"
                value={searchParams.get("format") ?? ""}
                onChange={(e) => updateParams({ format: e.target.value })}
              >
                <option value="">{t("allFormats")}</option>
                {Object.values(TournamentFormat).map((f) => (
                  <option key={f} value={f}>
                    {tEnum(`format.${f}`)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label htmlFor="type-filter" className="text-xs font-medium text-muted">
              {t("locationType")}
            </label>
            <div className="mt-1.5">
              <Select
                id="type-filter"
                value={searchParams.get("locationType") ?? ""}
                onChange={(e) => updateParams({ locationType: e.target.value })}
              >
                <option value="">{t("allLocationTypes")}</option>
                {Object.values(LocationType).map((type) => (
                  <option key={type} value={type}>
                    {tEnum(`locationType.${type}`)}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label htmlFor="city-filter" className="text-xs font-medium text-muted">
              {t("city")}
            </label>
            <div className="mt-1.5">
              <Select
                id="city-filter"
                value={searchParams.get("city") ?? ""}
                onChange={(e) => updateParams({ city: e.target.value })}
              >
                <option value="">{t("allCities")}</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <label htmlFor="date-filter" className="text-xs font-medium text-muted">
              {t("date")}
            </label>
            <DatePicker
              id="date-filter"
              className="mt-1.5"
              value={searchParams.get("date") ?? ""}
              onChange={(v) => updateParams({ date: v })}
              aria-label={t("date")}
            />
          </div>

          <div>
            <label htmlFor="level-filter" className="text-xs font-medium text-muted">
              {t("level")}
            </label>
            <div className="mt-1.5">
              <Select
                id="level-filter"
                value={searchParams.get("level") ?? ""}
                onChange={(e) => updateParams({ level: e.target.value })}
              >
                <option value="">{t("allLevels")}</option>
                {Object.values(Level).map((l) => (
                  <option key={l} value={l}>
                    {tEnum(`level.${l}`)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Активные фильтры чипами — видно, что именно сужает выдачу, и можно снять по одному */}
        {activeCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <span className="text-xs font-medium text-muted">{t("active")}</span>
            {activeFilters.map(({ key, value }) => (
              <button
                key={key}
                type="button"
                onClick={() => removeFilter(key)}
                className="group inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-2 text-xs font-medium text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100"
              >
                <span className="text-brand-500">{t(FILTER_TITLE_KEY[key])}:</span>
                {chipLabel(key, value)}
                <X size={13} className="text-brand-400 transition-colors group-hover:text-brand-700" />
                <span className="sr-only">{t("removeFilter")}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={handleReset}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <RotateCcw size={13} /> {t("resetAll")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
