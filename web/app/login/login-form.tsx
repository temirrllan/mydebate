"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { FieldError } from "@/components/auth/field-error";
import { GoogleButton } from "@/components/auth/google-button";
import { OrDivider } from "@/components/auth/divider";
import { loginUser, type ActionState } from "@/lib/actions/auth";

const initialState: ActionState = undefined;

export function LoginForm({
  callbackUrl,
  infoMessage,
}: {
  callbackUrl: string;
  infoMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(loginUser, initialState);
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const emailInvalid = emailTouched && email.trim().length > 0 && !/^\S+@\S+\.\S+$/.test(email);
  const emailErrors = state?.fieldErrors?.email;
  const passwordErrors = state?.fieldErrors?.password;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <h1 className="text-3xl font-extrabold text-navy-900">Вход в аккаунт</h1>
        <p className="mt-2 text-muted">Добро пожаловать! Войдите, чтобы продолжить</p>
      </div>

      {infoMessage && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {infoMessage}
        </p>
      )}

      {state?.message && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {state.message}
        </p>
      )}

      <GoogleButton label="Войти через Google" />

      <OrDivider />

      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div>
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email
        </label>
        <div className="relative mt-1.5">
          <Mail
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Введите ваш email"
            className="pl-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            invalid={Boolean(emailInvalid || emailErrors?.length)}
            aria-invalid={Boolean(emailInvalid || emailErrors?.length)}
            aria-describedby={emailInvalid || emailErrors?.length ? "email-error" : undefined}
          />
        </div>
        <FieldError
          id="email-error"
          messages={emailInvalid ? ["Введите корректный email"] : emailErrors}
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Пароль
        </label>
        <div className="mt-1.5">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="Введите ваш пароль"
            invalid={Boolean(passwordErrors?.length)}
            aria-invalid={Boolean(passwordErrors?.length)}
            aria-describedby={passwordErrors?.length ? "password-error" : undefined}
          />
        </div>
        <FieldError id="password-error" messages={passwordErrors} />
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-ink">
          <input
            type="checkbox"
            name="remember"
            defaultChecked
            className="h-4 w-4 rounded border-line text-brand-600 focus:ring-brand-500"
          />
          Запомнить меня
        </label>
        <Link href="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
          Забыли пароль?
        </Link>
      </div>

      <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
        {pending ? "Входим…" : "Войти"}
      </Button>

      <p className="text-center text-sm text-muted">
        Нет аккаунта?{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Создать аккаунт
        </Link>
      </p>
    </form>
  );
}
