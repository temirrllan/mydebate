"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/auth/field-error";
import { requestPasswordReset, type ActionState } from "@/lib/actions/auth";

const initialState: ActionState = undefined;

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);
  const [email, setEmail] = useState("");

  const fieldErrors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <h1 className="text-3xl font-extrabold text-navy-900">{t("forgot.title")}</h1>
        <p className="mt-2 text-muted">{t("forgot.subtitle")}</p>
      </div>

      {state?.success && state.message && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.message}
        </p>
      )}

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
            invalid={Boolean(fieldErrors.email?.length)}
            aria-invalid={Boolean(fieldErrors.email?.length)}
            aria-describedby={fieldErrors.email?.length ? "email-error" : undefined}
          />
        </div>
        <FieldError id="email-error" messages={fieldErrors.email} />
      </div>

      <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
        {pending ? t("forgot.pending") : t("forgot.submit")}
      </Button>

      <p className="text-center text-sm text-muted">
        {t("forgot.remembered")}{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          {t("forgot.login")}
        </Link>
      </p>
    </form>
  );
}
