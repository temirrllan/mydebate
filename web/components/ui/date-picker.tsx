"use client";

// Свой выбор даты вместо нативного <input type="date">.
//
// Зачем: нативный инпут рисует маску по локали БРАУЗЕРА, а не страницы. У
// пользователя с en-US это "мм/дд/гггг", поэтому набранное руками "10.08.2026"
// (10 августа) читалось как 8 октября — и валидация справедливо ругалась
// "Дедлайн регистрации не может быть позже даты начала турнира", хотя визуально
// дата была введена правильно. Здесь маска всегда русская (дд.мм.гггг), а
// значение наружу отдаётся в том же формате "YYYY-MM-DD", что и раньше, —
// схемы в lib/validations и queries.ts менять не нужно.
//
// ПОРЯДОК частей маски (день.месяц.год) одинаков во всех локалях и менять его
// нельзя: его же разбирает textToIso ниже. Переводится только подпись-
// подсказка («дд.мм.гггг» / «кк.аа.жжжж» / «dd.mm.yyyy»), а названия месяцев и
// дней недели берутся из Intl по текущей локали — держать их тремя списками в
// словаре незачем, они и так есть в браузере и в Node.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { LOCALE_TAG, type Locale } from "@/i18n/routing";
import { WEEKDAYS_KK_SHORT, kazakhMonths } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Названия месяцев на языке интерфейса: «Январь» / «Қаңтар» / «January». */
function monthNames(locale: string): string[] {
  // Казахский Intl в браузере не знает (см. lib/format.ts) — берём таблицу.
  if (locale === "kk") return kazakhMonths();
  const fmt = new Intl.DateTimeFormat(LOCALE_TAG[locale as Locale] ?? locale, {
    month: "long",
    timeZone: "UTC",
  });
  return Array.from({ length: 12 }, (_, m) =>
    capitalize(fmt.format(new Date(Date.UTC(2024, m, 1)))),
  );
}

/** Короткие дни недели, начиная с понедельника. */
function weekdayNames(locale: string): string[] {
  if (locale === "kk") return [...WEEKDAYS_KK_SHORT];
  const fmt = new Intl.DateTimeFormat(LOCALE_TAG[locale as Locale] ?? locale, {
    weekday: "short",
    timeZone: "UTC",
  });
  // 2024-01-01 — понедельник, дальше подряд.
  return Array.from({ length: 7 }, (_, i) =>
    capitalize(fmt.format(new Date(Date.UTC(2024, 0, 1 + i)))),
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "YYYY-MM-DD" из локальных частей даты (без UTC-сдвига, который даёт toISOString). */
function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" -> {year, month, day} или null. Проверяет реальность даты (31.02 -> null). */
function parseIso(iso: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** "дд.мм.гггг" -> "YYYY-MM-DD" или "" (если ввод ещё неполный/некорректный). */
function textToIso(text: string): string {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  if (!m) return "";
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  const year = Number(m[3]);
  if (month < 0 || month > 11 || day < 1 || day > daysInMonth(year, month)) return "";
  return toIso(year, month, day);
}

function isoToText(iso: string): string {
  const parts = parseIso(iso);
  if (!parts) return "";
  return `${String(parts.day).padStart(2, "0")}.${String(parts.month + 1).padStart(2, "0")}.${parts.year}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Понедельник = 0 (в JS getDay() воскресенье = 0). */
function firstWeekdayIndex(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function todayIso(): string {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Маска ввода: оставляем только цифры и расставляем точки — дд.мм.гггг. */
function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

export interface DatePickerProps {
  id?: string;
  /** Значение в формате "YYYY-MM-DD" ("" — не выбрано). */
  value: string;
  /** Отдаёт "YYYY-MM-DD" или "" при очистке. */
  onChange: (value: string) => void;
  /** Границы допустимого диапазона, тоже "YYYY-MM-DD". */
  min?: string;
  max?: string;
  /** По умолчанию — маска на языке интерфейса. */
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
}

export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder,
  invalid,
  disabled,
  className,
  clearable = true,
  ...aria
}: DatePickerProps) {
  const t = useTranslations("datePicker");
  const locale = useLocale();
  // Пересчитываем только при смене языка, а не на каждый рендер календаря.
  const months = useMemo(() => monthNames(locale), [locale]);
  const weekdays = useMemo(() => weekdayNames(locale), [locale]);

  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => isoToText(value));
  const rootRef = useRef<HTMLDivElement>(null);

  // Значение может измениться снаружи (сброс фильтров, ответ сервера) —
  // синхронизируем текстовое поле во время рендера, как в filters-bar.tsx.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(isoToText(value));
  }

  const selected = parseIso(value);
  const [viewYear, setViewYear] = useState(() => selected?.year ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selected?.month ?? new Date().getMonth());

  // При открытии календаря показываем месяц выбранной даты.
  function openCalendar() {
    if (disabled) return;
    const cur = parseIso(value);
    if (cur) {
      setViewYear(cur.year);
      setViewMonth(cur.month);
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleTextChange(raw: string) {
    const masked = applyMask(raw);
    setText(masked);
    const iso = textToIso(masked);
    if (iso) {
      onChange(iso);
      setSyncedValue(iso);
      const parts = parseIso(iso)!;
      setViewYear(parts.year);
      setViewMonth(parts.month);
    } else if (masked === "") {
      onChange("");
      setSyncedValue("");
    }
  }

  // На blur либо приводим текст к валидному значению, либо откатываем к текущему.
  function handleBlur() {
    const iso = textToIso(text);
    if (!iso && text !== "") setText(isoToText(value));
  }

  function pick(day: number) {
    const iso = toIso(viewYear, viewMonth, day);
    onChange(iso);
    setSyncedValue(iso);
    setText(isoToText(iso));
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function isDisabledDay(day: number): boolean {
    const iso = toIso(viewYear, viewMonth, day);
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  }

  const grid = useMemo(() => {
    const lead = firstWeekdayIndex(viewYear, viewMonth);
    const total = daysInMonth(viewYear, viewMonth);
    const cells: (number | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= total; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const today = todayIso();
  const showClear = clearable && Boolean(value) && !disabled;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Calendar
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        placeholder={placeholder ?? t("placeholder")}
        disabled={disabled}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={openCalendar}
        onClick={openCalendar}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full rounded-[var(--radius-btn)] border bg-white pl-10 pr-9 text-sm text-ink tabular-nums",
          "placeholder:text-muted transition-colors",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40",
          "disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted",
          invalid ? "border-rose-400 focus:border-rose-400 focus:ring-rose-400/30" : "border-line",
        )}
        {...aria}
      />

      {showClear ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setSyncedValue("");
            setText("");
          }}
          aria-label={t("clear")}
          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <X size={14} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openCalendar())}
          disabled={disabled}
          aria-label={t("open")}
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <ChevronRight size={14} className="rotate-90" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={t("label")}
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-[268px] rounded-[var(--radius-card)] border border-line bg-white p-3 shadow-lg shadow-navy-900/10"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label={t("prevMonth")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-sm font-semibold text-navy-900">
              {months[viewMonth]} {viewYear}
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label={t("nextMonth")}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-0.5">
            {weekdays.map((w) => (
              <div key={w} className="py-1 text-center text-[11px] font-medium text-muted">
                {w}
              </div>
            ))}
            {grid.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const iso = toIso(viewYear, viewMonth, day);
              const isSelected = iso === value;
              const isToday = iso === today;
              const isOff = isDisabledDay(day);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => pick(day)}
                  disabled={isOff}
                  aria-current={isToday ? "date" : undefined}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex h-9 items-center justify-center rounded-md text-sm tabular-nums transition-colors",
                    isSelected
                      ? "bg-brand-600 font-semibold text-white hover:bg-brand-700"
                      : isOff
                        ? "cursor-not-allowed text-muted/40"
                        : "text-ink hover:bg-brand-50 hover:text-brand-700",
                    isToday && !isSelected && "font-semibold text-brand-600 ring-1 ring-inset ring-brand-200",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
                if (!(min && today < min) && !(max && today > max)) {
                  onChange(today);
                  setSyncedValue(today);
                  setText(isoToText(today));
                  setOpen(false);
                }
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 transition-colors hover:bg-brand-50"
            >
              {t("today")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
