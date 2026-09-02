"use client";

import { FieldError } from "@/components/auth/field-error";
import { ImageUploadField } from "./image-upload-field";
import { SectionsEditor } from "./sections-editor";
import type { FieldErrors, WizardUpdate, WizardValues } from "./types";
import { useTranslations } from "next-intl";

const MIN_DESCRIPTION_LENGTH = 50;

/** Шаг 2 мастера создания турнира — описание, обложка/логотип, разделы. */
export function Step2Content({
  values,
  errors,
  update,
}: {
  values: WizardValues;
  errors: FieldErrors;
  update: WizardUpdate;
}) {
  const t = useTranslations("createTournament");
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="description" className="text-sm font-medium text-ink">
          {t("description")} <span className="text-rose-500">*</span>
        </label>
        <div className="relative mt-1.5">
          <textarea
            id="description"
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            rows={7}
            placeholder={t("descriptionPlaceholder")}
            className="w-full rounded-[var(--radius-btn)] border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            aria-invalid={Boolean(errors.description?.length)}
            aria-describedby={errors.description?.length ? "description-error" : undefined}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <FieldError id="description-error" messages={errors.description} />
          <span
            className={`ml-auto text-xs ${values.description.trim().length < MIN_DESCRIPTION_LENGTH ? "text-muted" : "text-emerald-600"}`}
          >
            {t("minChars", { count: values.description.length, min: MIN_DESCRIPTION_LENGTH })}
          </span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
        <ImageUploadField
          label={t("cover")}
          shape="wide"
          value={values.coverImage}
          onChange={(url) => update("coverImage", url)}
          hint={t("coverHint")}
          errors={errors.coverImage}
        />
        <ImageUploadField
          label={t("logo")}
          shape="square"
          value={values.logoImage}
          onChange={(url) => update("logoImage", url)}
          errors={errors.logoImage}
        />
      </div>

      <SectionsEditor
        sections={values.sections}
        onChange={(sections) => update("sections", sections)}
        errors={errors.sections}
      />
    </div>
  );
}
