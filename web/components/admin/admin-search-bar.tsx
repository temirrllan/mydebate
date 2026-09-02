"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, RotateCcw, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * Панель-контейнер для фильтров админских таблиц: единая рамка, заголовок,
 * счётчик активных фильтров и сброс. Контролы передаются детьми, чтобы каждая
 * страница компоновала свой набор (поиск / статус / роль), но выглядели они
 * одинаково — как панель фильтров каталога.
 */
export function AdminFilterBar({
  children,
  /** Ключи query-параметров, которые считаются фильтрами (для счётчика и сброса). */
  paramKeys,
  className,
}: {
  children: React.ReactNode;
  paramKeys: string[];
  className?: string;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeCount = paramKeys.filter((k) => searchParams.get(k)).length;

  function handleReset() {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition-opacity",
        isPending && "opacity-70",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          <SlidersHorizontal size={15} className="text-brand-600" aria-hidden="true" />
          {t("filters")}
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={activeCount === 0}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-white hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted"
        >
          <RotateCcw size={13} /> {t("reset")}
        </button>
      </div>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">{children}</div>
    </div>
  );
}

/**
 * Переиспользуемые примитивы поиска/фильтра для админских таблиц
 * (модерация/пользователи/обращения) — тот же паттерн, что и
 * `components/tournaments/filters-bar.tsx` (дебаунс поиска, запись в URL
 * query через `router.replace`, без полной перезагрузки страницы; сброс
 * `page` при изменении фильтра). В отличие от каталога турниров здесь нет
 * единой формы — каждая страница компонует `AdminSearchInput` и
 * `AdminFilterSelect` рядом, оба независимо читают/пишут свой параметр.
 */
export function AdminSearchInput({
  placeholder,
  paramKey = "search",
  className,
}: {
  placeholder: string;
  paramKey?: string;
  className?: string;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlValue = searchParams.get(paramKey) ?? "";
  const [value, setValue] = useState(urlValue);
  // Синхронизация "во время рендера" (не в useEffect) — тот же паттерн, что и
  // в filters-bar.tsx, нужен для прямых ссылок/кнопки сброса извне.
  const [syncedUrlValue, setSyncedUrlValue] = useState(urlValue);
  if (urlValue !== syncedUrlValue) {
    setSyncedUrlValue(urlValue);
    setValue(urlValue);
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function commit(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(paramKey, next);
    else params.delete(paramKey);
    params.delete("page");
    startTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    });
  }

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => commit(next), 400);
  }

  return (
    <div className={className}>
      <span className="text-xs font-medium text-muted">{t("search")}</span>
      <div className="relative mt-1.5">
        <Search
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
        <Input
          type="text"
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn("pl-10", value && "pr-9")}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              setValue("");
              commit("");
            }}
            aria-label={t("clearSearch")}
            className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-canvas hover:text-ink"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Select, пишущий один параметр в URL query — используется рядом с `AdminSearchInput`. */
export function AdminFilterSelect({
  paramKey,
  value,
  options,
  wrapperClassName,
  label,
}: {
  paramKey: string;
  value: string;
  options: { value: string; label: string }[];
  wrapperClassName?: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function handleChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set(paramKey, next);
    else params.delete(paramKey);
    params.delete("page");
    startTransition(() => {
      router.replace(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
    });
  }

  return (
    <div className={wrapperClassName}>
      {label && <span className="text-xs font-medium text-muted">{label}</span>}
      <Select
        aria-label={label}
        wrapperClassName={cn(label && "mt-1.5")}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value || "_all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
