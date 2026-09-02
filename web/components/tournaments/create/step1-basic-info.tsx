"use client";

import { Trophy, Globe2, MapPin, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/auth/field-error";
import { TournamentFormat, LocationType, Level } from "@/lib/enums";
import { FORMAT_LABEL, LEVEL_LABEL, LOCATION_TYPE_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LANGUAGE_OPTIONS, type FieldErrors, type WizardUpdate, type WizardValues } from "./types";
import { useTranslations } from "next-intl";

/** Сегодняшняя дата в формате "YYYY-MM-DD" по локальному календарю пользователя. */
function todayIsoLocal(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

/** Шаг 1 мастера создания турнира — название, формат, место, языки, даты, цена. */
export function Step1BasicInfo({
  values,
  errors,
  update,
}: {
  values: WizardValues;
  errors: FieldErrors;
  update: WizardUpdate;
}) {
  const t = useTranslations("createTournament");
  const isOffline = values.locationType === LocationType.OFFLINE;
  // Границы календарей повторяют кросс-проверки step1Schema (validateStep1Cross):
  // прошлое недоступно, окончание не раньше начала, дедлайн не позже старта.
  // Так пользователь просто не может выбрать дату, которая потом даст ошибку.
  const today = todayIsoLocal();

  function toggleLanguage(lang: string) {
    update(
      "languages",
      values.languages.includes(lang)
        ? values.languages.filter((l) => l !== lang)
        : [...values.languages, lang],
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="title" className="text-sm font-medium text-ink">
          {t("name")} <span className="text-rose-500">*</span>
        </label>
        <div className="relative mt-1.5">
          <Trophy size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            id="title"
            value={values.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={t("namePlaceholder")}
            className="pl-10"
            invalid={Boolean(errors.title?.length)}
            aria-invalid={Boolean(errors.title?.length)}
            aria-describedby={errors.title?.length ? "title-error" : undefined}
          />
        </div>
        <FieldError id="title-error" messages={errors.title} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div role="group" aria-labelledby="format-group-label">
          <span id="format-group-label" className="text-sm font-medium text-ink">
            {t("format")} <span className="text-rose-500">*</span>
          </span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {Object.values(TournamentFormat).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => update("format", format)}
                aria-pressed={values.format === format}
                className={cn(
                  "h-11 rounded-[var(--radius-btn)] border text-sm font-medium transition-colors",
                  values.format === format
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-line bg-white text-ink hover:border-brand-300",
                )}
              >
                {FORMAT_LABEL[format]}
              </button>
            ))}
          </div>
          <FieldError messages={errors.format} />
        </div>

        <div role="group" aria-labelledby="locationType-group-label">
          <span id="locationType-group-label" className="text-sm font-medium text-ink">
            {t("locationType")} <span className="text-rose-500">*</span>
          </span>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {Object.values(LocationType).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => update("locationType", type)}
                aria-pressed={values.locationType === type}
                className={cn(
                  "h-11 rounded-[var(--radius-btn)] border text-sm font-medium transition-colors",
                  values.locationType === type
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-line bg-white text-ink hover:border-brand-300",
                )}
              >
                {LOCATION_TYPE_LABEL[type]}
              </button>
            ))}
          </div>
          <FieldError messages={errors.locationType} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="level" className="text-sm font-medium text-ink">
            {t("level")} <span className="text-muted">{t("optional")}</span>
          </label>
          <div className="mt-1.5">
            <Select
              id="level"
              value={values.level}
              onChange={(e) => update("level", e.target.value)}
              aria-describedby={errors.level?.length ? "level-error" : undefined}
            >
              <option value="">{t("levelNotSet")}</option>
              {Object.values(Level).map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l] ?? l}
                </option>
              ))}
            </Select>
          </div>
          <FieldError id="level-error" messages={errors.level} />
        </div>

        <div role="group" aria-labelledby="languages-group-label">
          <span id="languages-group-label" className="text-sm font-medium text-ink">
            {t("languages")} <span className="text-rose-500">*</span>
          </span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((lang) => {
              const active = values.languages.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  aria-pressed={active}
                  className={cn(
                    "h-11 rounded-[var(--radius-btn)] border px-4 text-sm font-medium transition-colors",
                    active
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-line bg-white text-ink hover:border-brand-300",
                  )}
                >
                  {lang}
                </button>
              );
            })}
          </div>
          <FieldError messages={errors.languages} />
        </div>
      </div>

      {isOffline && (
        <div className="space-y-5 rounded-[var(--radius-btn)] border border-line bg-canvas p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            <MapPin size={16} className="text-brand-600" /> {t("venueSection")}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="city" className="text-sm font-medium text-ink">
                {t("city")} <span className="text-rose-500">*</span>
              </label>
              <Input
                id="city"
                value={values.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder={t("cityPlaceholder")}
                className="mt-1.5"
                invalid={Boolean(errors.city?.length)}
                aria-invalid={Boolean(errors.city?.length)}
                aria-describedby={errors.city?.length ? "city-error" : undefined}
              />
              <FieldError id="city-error" messages={errors.city} />
            </div>
            <div>
              <label htmlFor="venue" className="text-sm font-medium text-ink">
                {t("venue")} <span className="text-muted">{t("optional")}</span>
              </label>
              <Input
                id="venue"
                value={values.venue}
                onChange={(e) => update("venue", e.target.value)}
                placeholder={t("venuePlaceholder")}
                className="mt-1.5"
                aria-describedby={errors.venue?.length ? "venue-error" : undefined}
              />
              <FieldError id="venue-error" messages={errors.venue} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="text-sm font-medium text-ink">
                {t("address")} <span className="text-muted">{t("optional")}</span>
              </label>
              <Input
                id="address"
                value={values.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder={t("addressPlaceholder")}
                className="mt-1.5"
                aria-describedby={errors.address?.length ? "address-error" : undefined}
              />
              <FieldError id="address-error" messages={errors.address} />
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="startDate" className="text-sm font-medium text-ink">
            {t("startDate")} <span className="text-rose-500">*</span>
          </label>
          <DatePicker
            id="startDate"
            className="mt-1.5"
            value={values.startDate}
            onChange={(v) => update("startDate", v)}
            min={today}
            invalid={Boolean(errors.startDate?.length)}
            aria-describedby={errors.startDate?.length ? "startDate-error" : undefined}
          />
          <FieldError id="startDate-error" messages={errors.startDate} />
        </div>

        <div>
          <label htmlFor="endDate" className="text-sm font-medium text-ink">
            {t("endDate")} <span className="text-muted">{t("optional")}</span>
          </label>
          <DatePicker
            id="endDate"
            className="mt-1.5"
            value={values.endDate}
            onChange={(v) => update("endDate", v)}
            min={values.startDate || today}
            invalid={Boolean(errors.endDate?.length)}
            aria-describedby={errors.endDate?.length ? "endDate-error" : undefined}
          />
          <FieldError id="endDate-error" messages={errors.endDate} />
        </div>

        <div>
          <label htmlFor="registrationDeadline" className="text-sm font-medium text-ink">
            {t("deadline")} <span className="text-rose-500">*</span>
          </label>
          <DatePicker
            id="registrationDeadline"
            className="mt-1.5"
            value={values.registrationDeadline}
            onChange={(v) => update("registrationDeadline", v)}
            min={today}
            max={values.startDate || undefined}
            invalid={Boolean(errors.registrationDeadline?.length)}
            aria-describedby={
              errors.registrationDeadline?.length ? "registrationDeadline-error" : undefined
            }
          />
          <FieldError id="registrationDeadline-error" messages={errors.registrationDeadline} />
        </div>
      </div>

      <div className="sm:w-1/3">
        <label htmlFor="price" className="text-sm font-medium text-ink">
          {t("price")} <span className="text-muted">{t("priceHint")}</span>
        </label>
        <div className="relative mt-1.5">
          <Wallet size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            id="price"
            type="number"
            min={0}
            step={1}
            value={values.price}
            onChange={(e) => update("price", e.target.value)}
            className="pl-10"
            invalid={Boolean(errors.price?.length)}
            aria-invalid={Boolean(errors.price?.length)}
            aria-describedby={errors.price?.length ? "price-error" : undefined}
          />
        </div>
        <FieldError id="price-error" messages={errors.price} />
      </div>

      {!isOffline && (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Globe2 size={14} /> {t("onlineNotice")}
        </p>
      )}
    </div>
  );
}
