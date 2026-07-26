"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/auth/field-error";
import { updateProfile } from "@/lib/actions/profile";
import { LEVEL_LABEL } from "@/lib/format";
import { Level, parseLanguages } from "@/lib/enums";

const LEVEL_OPTIONS = [Level.BEGINNER, Level.INTERMEDIATE, Level.ADVANCED] as const;

export type ProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  school: string;
  major: string;
  experience: string;
  bio: string;
  level: string;
  languages: string;
};

/**
 * Форма редактирования личных данных (личный кабинет → «Настройки»).
 * Контролируемые поля (тот же паттерн, что CreateUserForm/register-form) —
 * значения переживают ошибку валидации. Email показан, но задизейблен: это
 * логин-идентификатор, смена — через поддержку (см. validations/profile.ts).
 */
export function SettingsForm({ initial }: { initial: ProfileFormValues }) {
  const [state, formAction, pending] = useActionState(updateProfile, undefined);
  const [values, setValues] = useState(initial);

  const fieldErrors = state?.fieldErrors ?? {};

  function update<K extends keyof ProfileFormValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const err = (name: keyof ProfileFormValues) => Boolean(fieldErrors[name]?.length);
  const descId = (name: string) => (fieldErrors[name]?.length ? `pf-${name}-error` : undefined);

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-lg font-bold text-navy-900">Личная информация</h2>
      <p className="mt-1 text-sm text-muted">Эти данные видны организаторам в ваших заявках.</p>

      {state?.success && (
        <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} className="mr-1.5 inline-block" aria-hidden="true" />
          {state.message}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          ❌ {state.error}
        </p>
      )}

      <form action={formAction} noValidate className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Имя" required htmlFor="firstName" error={fieldErrors.firstName} errorId={descId("firstName")}>
            <Input
              id="firstName"
              name="firstName"
              required
              value={values.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              invalid={err("firstName")}
              aria-invalid={err("firstName")}
              aria-describedby={descId("firstName")}
            />
          </Field>

          <Field label="Фамилия" required htmlFor="lastName" error={fieldErrors.lastName} errorId={descId("lastName")}>
            <Input
              id="lastName"
              name="lastName"
              required
              value={values.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              invalid={err("lastName")}
              aria-invalid={err("lastName")}
              aria-describedby={descId("lastName")}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Email
            </label>
            <div className="mt-1.5">
              <Input id="email" value={values.email} disabled readOnly className="bg-canvas text-muted" />
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Email — это логин, его смена только через поддержку.
            </p>
          </div>

          <Field label="Телефон" htmlFor="phone" error={fieldErrors.phone} errorId={descId("phone")}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+7 …"
              value={values.phone}
              onChange={(e) => update("phone", e.target.value)}
              invalid={err("phone")}
              aria-invalid={err("phone")}
              aria-describedby={descId("phone")}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Город" htmlFor="city" error={fieldErrors.city} errorId={descId("city")}>
            <Input
              id="city"
              name="city"
              placeholder="Астана"
              value={values.city}
              onChange={(e) => update("city", e.target.value)}
              invalid={err("city")}
              aria-invalid={err("city")}
              aria-describedby={descId("city")}
            />
          </Field>

          <Field label="Уровень опыта" htmlFor="level" error={fieldErrors.level} errorId={descId("level")}>
            <Select
              id="level"
              name="level"
              value={values.level}
              onChange={(e) => update("level", e.target.value)}
              invalid={err("level")}
              aria-invalid={err("level")}
              aria-describedby={descId("level")}
            >
              <option value="">Не указан</option>
              {LEVEL_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l] ?? l}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Школа / Университет" htmlFor="school" error={fieldErrors.school} errorId={descId("school")}>
            <Input
              id="school"
              name="school"
              placeholder="Назарбаев Университет"
              value={values.school}
              onChange={(e) => update("school", e.target.value)}
              invalid={err("school")}
              aria-invalid={err("school")}
              aria-describedby={descId("school")}
            />
          </Field>

          <Field label="Направление / Специальность" htmlFor="major" error={fieldErrors.major} errorId={descId("major")}>
            <Input
              id="major"
              name="major"
              placeholder="Международные отношения"
              value={values.major}
              onChange={(e) => update("major", e.target.value)}
              invalid={err("major")}
              aria-invalid={err("major")}
              aria-describedby={descId("major")}
            />
          </Field>
        </div>

        <Field
          label="Языки"
          htmlFor="languages"
          error={fieldErrors.languages}
          errorId={descId("languages")}
          hint="Через запятую, например: Русский, English, Қазақша"
        >
          <Input
            id="languages"
            name="languages"
            placeholder="Русский, English"
            value={values.languages}
            onChange={(e) => update("languages", e.target.value)}
            invalid={err("languages")}
            aria-invalid={err("languages")}
            aria-describedby={descId("languages")}
          />
          {parseLanguages(values.languages).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {parseLanguages(values.languages).map((lang) => (
                <span key={lang} className="rounded-md bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                  {lang}
                </span>
              ))}
            </div>
          )}
        </Field>

        <Field label="О себе" htmlFor="bio" error={fieldErrors.bio} errorId={descId("bio")}>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            placeholder="Коротко о вашем опыте в дебатах / MUN…"
            value={values.bio}
            onChange={(e) => update("bio", e.target.value)}
            aria-invalid={err("bio")}
            aria-describedby={descId("bio")}
            className="w-full rounded-[var(--radius-btn)] border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </Field>

        <Field label="Опыт участия" htmlFor="experience" error={fieldErrors.experience} errorId={descId("experience")}>
          <textarea
            id="experience"
            name="experience"
            rows={3}
            placeholder="Турниры, награды, роли…"
            value={values.experience}
            onChange={(e) => update("experience", e.target.value)}
            aria-invalid={err("experience")}
            aria-describedby={descId("experience")}
            className="w-full rounded-[var(--radius-btn)] border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : <><Save size={16} /> Сохранить</>}
        </Button>
      </form>
    </Card>
  );
}

/** Обёртка «label + поле + ошибка + подсказка» — убирает повтор разметки. */
function Field({
  label,
  htmlFor,
  required,
  error,
  errorId,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string[];
  errorId?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error?.length && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      <FieldError id={errorId} messages={error} />
    </div>
  );
}
