"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { FieldError } from "@/components/auth/field-error";
import { changePassword } from "@/lib/actions/profile";
import { passwordRequirements } from "@/lib/validations/auth";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };

/**
 * Смена пароля (личный кабинет → «Настройки»). Контролируемые поля; при
 * успехе очищаются. Требует текущий пароль (проверка на сервере) — живой
 * чеклист требований нового пароля повторяет макет регистрации.
 */
export function ChangePasswordForm() {
  // Кабинет ещё не переведён целиком, но чеклист требований к паролю общий с
  // формой регистрации — берём подписи оттуда, чтобы они не разъехались.
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(changePassword, undefined);
  const [values, setValues] = useState(EMPTY);

  const fieldErrors = state?.fieldErrors ?? {};

  function update<K extends keyof typeof EMPTY>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // При успехе очищаем поля (паттерн CreateUserForm).
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.success) setValues(EMPTY);
  }

  const err = (name: keyof typeof EMPTY) => Boolean(fieldErrors[name]?.length);
  const descId = (name: string) => (fieldErrors[name]?.length ? `pw-${name}-error` : undefined);

  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <KeyRound size={18} />
        </div>
        <h2 className="text-lg font-bold text-navy-900">Смена пароля</h2>
      </div>

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
        <div>
          <label htmlFor="currentPassword" className="text-sm font-medium text-ink">
            Текущий пароль <span className="text-rose-500">*</span>
          </label>
          <div className="mt-1.5">
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              autoComplete="current-password"
              required
              value={values.currentPassword}
              onChange={(e) => update("currentPassword", e.target.value)}
              invalid={err("currentPassword")}
              aria-invalid={err("currentPassword")}
              aria-describedby={descId("currentPassword")}
            />
          </div>
          <FieldError id={descId("currentPassword")} messages={fieldErrors.currentPassword} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="newPassword" className="text-sm font-medium text-ink">
              Новый пароль <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1.5">
              <PasswordInput
                id="newPassword"
                name="newPassword"
                autoComplete="new-password"
                required
                value={values.newPassword}
                onChange={(e) => update("newPassword", e.target.value)}
                invalid={err("newPassword")}
                aria-invalid={err("newPassword")}
                aria-describedby={descId("newPassword")}
              />
            </div>
            <FieldError id={descId("newPassword")} messages={fieldErrors.newPassword} />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
              Повторите пароль <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1.5">
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                autoComplete="new-password"
                required
                value={values.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                invalid={err("confirmPassword")}
                aria-invalid={err("confirmPassword")}
                aria-describedby={descId("confirmPassword")}
              />
            </div>
            <FieldError id={descId("confirmPassword")} messages={fieldErrors.confirmPassword} />
          </div>
        </div>

        {/* Живой чеклист требований к новому паролю (макет регистрации). */}
        {values.newPassword.length > 0 && (
          <ul className="space-y-1" aria-live="polite">
            {passwordRequirements.map((req) => {
              const passed = req.test(values.newPassword);
              return (
                <li
                  key={req.key}
                  className={passed ? "text-xs text-emerald-600" : "text-xs text-muted"}
                >
                  {passed ? "✓" : "○"} {t(`password.${req.key}`)}
                </li>
              );
            })}
          </ul>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : <><KeyRound size={16} /> Изменить пароль</>}
        </Button>
      </form>
    </Card>
  );
}
