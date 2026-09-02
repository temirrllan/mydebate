"use client";

import { Plus, Trash2, Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/auth/field-error";
import type { WizardSection } from "./types";
import { useTranslations } from "next-intl";

const MAX_SECTIONS = 20;

/** Динамический список разделов описания турнира (шаг 2) — добавить/удалить, до 20 штук. */
export function SectionsEditor({
  sections,
  onChange,
  errors,
}: {
  sections: WizardSection[];
  onChange: (sections: WizardSection[]) => void;
  /** zod .flatten() схлопывает вложенные ошибки sections[i].title/description в один
   * массив под ключом "sections" (path[0]) — точный индекс/поле не восстановить,
   * поэтому показываем как общее предупреждение под списком, а не адресно. */
  errors?: string[];
}) {
  const t = useTranslations("createTournament");
  function update(index: number, patch: Partial<WizardSection>) {
    onChange(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function add() {
    if (sections.length >= MAX_SECTIONS) return;
    onChange([...sections, { title: "", description: "" }]);
  }

  function remove(index: number) {
    onChange(sections.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink">
          {t("sections")} <span className="text-muted">{t("optional")}</span>
        </label>
        <span className="text-xs text-muted">
          {sections.length}/{MAX_SECTIONS}
        </span>
      </div>

      {sections.length === 0 ? (
        <div className="mt-2 flex flex-col items-center gap-2 rounded-[var(--radius-btn)] border border-dashed border-line bg-canvas px-4 py-6 text-center text-sm text-muted">
          <Layers size={20} />
          {t("sectionsHint")}
        </div>
      ) : (
        <div className="mt-2 space-y-4">
          {sections.map((section, index) => (
            <div key={index} className="rounded-[var(--radius-btn)] border border-line p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-3">
                  <div>
                    <label htmlFor={`section-title-${index}`} className="text-xs font-medium text-muted">
                      {t("sectionTitle")}
                    </label>
                    <Input
                      id={`section-title-${index}`}
                      value={section.title}
                      onChange={(e) => update(index, { title: e.target.value })}
                      placeholder={t("sectionTitlePlaceholder")}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label htmlFor={`section-description-${index}`} className="text-xs font-medium text-muted">
                      {t("sectionDescription")}
                    </label>
                    <textarea
                      id={`section-description-${index}`}
                      value={section.description}
                      onChange={(e) => update(index, { description: e.target.value })}
                      rows={3}
                      placeholder={t("sectionDescriptionPlaceholder")}
                      className="mt-1 w-full rounded-[var(--radius-btn)] border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-rose-50 hover:text-rose-600"
                  aria-label={t("sectionRemove")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={sections.length >= MAX_SECTIONS}>
          <Plus size={16} /> {t("sectionAdd")}
        </Button>
      </div>
      <FieldError messages={errors} />
    </div>
  );
}
