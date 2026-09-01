"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(loginUser, initialState);
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);

  const emailInvalid = emailTouched && email.trim().length > 0 && !/^\S+@\S+\.\S+$/.test(email);
  const emailErrors = state?.fieldErrors?.email;
  const passwordErrors = state?.fieldErrors?.password;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <h1 className="text-3xl font-extrabold text-navy-900">{t("login.title")}</h1>
        <p className="mt-2 text-muted">{t("login.subtitle")}</p>
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

      <GoogleButton label={t("login.google")} callbackUrl={callbackUrl} />

      <OrDivider />

      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div>
        <label htmlFor="email" className="text-sm font-medium text-ink">
          {t("emailLabel")}
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
            placeholder={t("emailPlaceholder")}
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
          messages={emailInvalid ? [t("emailInvalid")] : emailErrors}
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-ink">
          {t("passwordLabel")}
        </label>
        <div className="mt-1.5">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder={t("passwordPlaceholder")}
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
          {t("login.remember")}
        </label>
        <Link href="/forgot-password" className="font-medium text-brand-600 hover:text-brand-700">
          {t("login.forgot")}
        </Link>
      </div>

      <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
        {pending ? t("login.pending") : t("login.submit")}
      </Button>

      <p className="text-center text-sm text-muted">
        {t("login.noAccount")}{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">
          {t("login.createAccount")}
        </Link>
      </p>
    </form>
  );
}
