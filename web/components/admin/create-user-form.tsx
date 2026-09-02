"use client";

import { useActionState, useState } from "react";
import { UserPlus, User, Mail, Phone, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { FieldError } from "@/components/auth/field-error";
import { createUserByAdmin } from "@/lib/actions/admin";
import { Role } from "@/lib/enums";
import { useTranslations } from "next-intl";

const initialState = undefined;

const ROLE_OPTIONS = [Role.USER, Role.ORGANIZER, Role.ADMIN] as const;

const EMPTY_VALUES = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  role: Role.USER as string,
};

/**
 * Форма «Добавить пользователя» на /admin/users (Фича 3). Контролируемые
 * поля (тот же паттерн, что и app/register/register-form.tsx) — значения
 * переживают ошибку валидации, а при успехе явно сбрасываются в начальное
 * состояние. Список пользователей обновится сам за счёт revalidatePath
 * внутри createUserByAdmin — здесь ничего дополнительно рефетчить не нужно.
 */
export function CreateUserForm() {
  const t = useTranslations("admin");
  const tEnum = useTranslations("enums");
  const [state, formAction, pending] = useActionState(createUserByAdmin, initialState);
  const [values, setValues] = useState(EMPTY_VALUES);

  const fieldErrors = state?.fieldErrors ?? {};

  function update<K extends keyof typeof EMPTY_VALUES>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // После успешного создания форма остаётся на месте (не сворачивается) —
  // очищаем контролируемые поля, показываем зелёный баннер, ссылка на
  // созданного пользователя не нужна: список ниже уже обновлён revalidatePath.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) {
      setValues(EMPTY_VALUES);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <UserPlus size={18} />
        </div>
        <h2 className="text-lg font-bold text-navy-900">{t("addUser")}</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        {t("addUserHint")}
      </p>

      {state?.success && (
        <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} className="mr-1.5 inline-block" aria-hidden="true" />
          {state.message}
        </p>
      )}
      {state?.error && !state.success && (
        <p role="alert" className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          ❌ {state.error}
        </p>
      )}

      <form action={formAction} noValidate className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="text-sm font-medium text-ink">
              {t("firstName")} <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="firstName"
                name="firstName"
                required
                placeholder={t("firstNamePlaceholder")}
                className="pl-10"
                value={values.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                invalid={Boolean(fieldErrors.firstName?.length)}
                aria-invalid={Boolean(fieldErrors.firstName?.length)}
                aria-describedby={fieldErrors.firstName?.length ? "cu-firstName-error" : undefined}
              />
            </div>
            <FieldError id="cu-firstName-error" messages={fieldErrors.firstName} />
          </div>

          <div>
            <label htmlFor="lastName" className="text-sm font-medium text-ink">
              {t("lastName")} <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1.5">
              <Input
                id="lastName"
                name="lastName"
                required
                placeholder={t("lastNamePlaceholder")}
                value={values.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                invalid={Boolean(fieldErrors.lastName?.length)}
                aria-invalid={Boolean(fieldErrors.lastName?.length)}
                aria-describedby={fieldErrors.lastName?.length ? "cu-lastName-error" : undefined}
              />
            </div>
            <FieldError id="cu-lastName-error" messages={fieldErrors.lastName} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="example@mail.com"
                className="pl-10"
                value={values.email}
                onChange={(e) => update("email", e.target.value)}
                invalid={Boolean(fieldErrors.email?.length)}
                aria-invalid={Boolean(fieldErrors.email?.length)}
                aria-describedby={fieldErrors.email?.length ? "cu-email-error" : undefined}
              />
            </div>
            <FieldError id="cu-email-error" messages={fieldErrors.email} />
          </div>

          <div>
            <label htmlFor="phone" className="text-sm font-medium text-ink">
              {t("phone")} <span className="text-muted">{t("optional")}</span>
            </label>
            <div className="relative mt-1.5">
              <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder={t("phonePlaceholder")}
                className="pl-10"
                value={values.phone}
                onChange={(e) => update("phone", e.target.value)}
                invalid={Boolean(fieldErrors.phone?.length)}
                aria-invalid={Boolean(fieldErrors.phone?.length)}
                aria-describedby={fieldErrors.phone?.length ? "cu-phone-error" : undefined}
              />
            </div>
            <FieldError id="cu-phone-error" messages={fieldErrors.phone} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="text-sm font-medium text-ink">
              {t("password")} <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1.5">
              <PasswordInput
                id="password"
                name="password"
                autoComplete="new-password"
                required
                placeholder={t("passwordPlaceholder")}
                value={values.password}
                onChange={(e) => update("password", e.target.value)}
                invalid={Boolean(fieldErrors.password?.length)}
                aria-invalid={Boolean(fieldErrors.password?.length)}
                aria-describedby={fieldErrors.password?.length ? "cu-password-error" : undefined}
              />
            </div>
            <FieldError id="cu-password-error" messages={fieldErrors.password} />
          </div>

          <div>
            <label htmlFor="role" className="text-sm font-medium text-ink">
              {t("role")} <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1.5">
              <Select
                id="role"
                name="role"
                value={values.role}
                onChange={(e) => update("role", e.target.value)}
                invalid={Boolean(fieldErrors.role?.length)}
                aria-invalid={Boolean(fieldErrors.role?.length)}
                aria-describedby={fieldErrors.role?.length ? "cu-role-error" : undefined}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {tEnum(`role.${r}`)}
                  </option>
                ))}
              </Select>
            </div>
            <FieldError id="cu-role-error" messages={fieldErrors.role} />
          </div>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? (
            t("creating")
          ) : (
            <>
              <UserPlus size={16} /> {t("createUser")}
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
