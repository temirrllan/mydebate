"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { FieldError } from "@/components/auth/field-error";
import { cn } from "@/lib/utils";
import { resetPassword, type ActionState } from "@/lib/actions/auth";
import { passwordRequirements } from "@/lib/validations/auth";

const initialState: ActionState = undefined;

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);

  const fieldErrors = state?.fieldErrors ?? {};
  const confirmMismatch =
    confirmTouched && confirmPassword.length > 0 && confirmPassword !== password;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <h1 className="text-3xl font-extrabold text-navy-900">Новый пароль</h1>
        <p className="mt-2 text-muted">Придумайте новый пароль для входа в аккаунт.</p>
      </div>

      {state?.message && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {state.message}
        </p>
      )}

      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Новый пароль
        </label>
        <div className="mt-1.5">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            placeholder="Создайте новый пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={Boolean(fieldErrors.password?.length)}
            aria-invalid={Boolean(fieldErrors.password?.length)}
            aria-describedby={fieldErrors.password?.length ? "password-error" : undefined}
          />
        </div>
        <FieldError id="password-error" messages={fieldErrors.password} />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
          Подтвердите пароль
        </label>
        <div className="mt-1.5">
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            placeholder="Повторите пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onBlur={() => setConfirmTouched(true)}
            invalid={Boolean(confirmMismatch || fieldErrors.confirmPassword?.length)}
            aria-invalid={Boolean(confirmMismatch || fieldErrors.confirmPassword?.length)}
            aria-describedby={
              confirmMismatch || fieldErrors.confirmPassword?.length
                ? "confirmPassword-error"
                : undefined
            }
          />
        </div>
        <FieldError
          id="confirmPassword-error"
          messages={confirmMismatch ? ["Пароли не совпадают"] : fieldErrors.confirmPassword}
        />
      </div>

      <div className="rounded-lg bg-brand-50/60 px-4 py-3.5">
        <p className="text-sm font-medium text-ink">Пароль должен содержать:</p>
        <ul className="mt-2 space-y-1.5" aria-live="polite">
          {passwordRequirements.map((req) => {
            const ok = req.test(password);
            return (
              <li
                key={req.label}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  ok ? "text-emerald-600" : "text-muted",
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    ok ? "border-emerald-500 bg-emerald-500 text-white" : "border-line",
                  )}
                >
                  {ok && <Check size={11} strokeWidth={3} />}
                </span>
                {req.label}
              </li>
            );
          })}
        </ul>
      </div>

      <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
        {pending ? "Сохраняем…" : "Сохранить новый пароль"}
      </Button>

      <p className="text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Вернуться ко входу
        </Link>
      </p>
    </form>
  );
}
