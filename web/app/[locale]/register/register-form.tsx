"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Mail, Phone, User, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";
import { FieldError } from "@/components/auth/field-error";
import { GoogleButton } from "@/components/auth/google-button";
import { OrDivider } from "@/components/auth/divider";
import { cn } from "@/lib/utils";
import { registerUser, type ActionState } from "@/lib/actions/auth";
import { passwordRequirements } from "@/lib/validations/auth";

const initialState: ActionState = undefined;

export function RegisterForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(registerUser, initialState);
  // firstName/lastName/email контролируются так же, как password/confirmPassword:
  // React 19 автоматически сбрасывает несконтролируемые поля формы после
  // завершения Server Action (даже при ошибке валидации, т.к. React не знает
  // о нашем "success" внутри состояния — сбрасывает при любом resolve), из-за
  // чего пользователь терял введённые имя/фамилию/email после любой мелкой
  // ошибки. Controlled value перекрывает этот автосброс, как уже сделано для
  // пароля.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmTouched, setConfirmTouched] = useState(false);

  const fieldErrors = state?.fieldErrors ?? {};
  const confirmMismatch =
    confirmTouched && confirmPassword.length > 0 && confirmPassword !== password;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <h1 className="text-3xl font-extrabold text-navy-900">{t("register.title")}</h1>
        <p className="mt-2 text-muted">{t("register.subtitle")}</p>
      </div>

      {state?.message && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {state.message}
        </p>
      )}

      <GoogleButton label={t("register.google")} />

      <OrDivider />

      {/*
        Отклонение от макета "Регистрация.png": там одно поле "Имя и
        фамилия". По ТЗ Этапа 2 firstName/lastName — раздельные обязательные
        поля модели User, поэтому здесь два отдельных инпута (важно для
        валидации и хранения в БД раздельно).
      */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="text-sm font-medium text-ink">
            {t("register.firstName")}
          </label>
          <div className="relative mt-1.5">
            <User
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              required
              placeholder={t("register.firstNamePlaceholder")}
              className="pl-10"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              invalid={Boolean(fieldErrors.firstName?.length)}
              aria-invalid={Boolean(fieldErrors.firstName?.length)}
              aria-describedby={fieldErrors.firstName?.length ? "firstName-error" : undefined}
            />
          </div>
          <FieldError id="firstName-error" messages={fieldErrors.firstName} />
        </div>

        <div>
          <label htmlFor="lastName" className="text-sm font-medium text-ink">
            {t("register.lastName")}
          </label>
          <div className="mt-1.5">
            <Input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              required
              placeholder={t("register.lastNamePlaceholder")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              invalid={Boolean(fieldErrors.lastName?.length)}
              aria-invalid={Boolean(fieldErrors.lastName?.length)}
              aria-describedby={fieldErrors.lastName?.length ? "lastName-error" : undefined}
            />
          </div>
          <FieldError id="lastName-error" messages={fieldErrors.lastName} />
        </div>
      </div>

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

      <div>
        <label htmlFor="phone" className="text-sm font-medium text-ink">
          {t("register.phone")}
        </label>
        <div className="relative mt-1.5">
          <Phone
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder={t("register.phonePlaceholder")}
            className="pl-10"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            invalid={Boolean(fieldErrors.phone?.length)}
            aria-describedby={fieldErrors.phone?.length ? "phone-error" : undefined}
          />
        </div>
        <FieldError id="phone-error" messages={fieldErrors.phone} />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium text-ink">
          {t("passwordLabel")}
        </label>
        <div className="mt-1.5">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            placeholder={t("register.passwordPlaceholder")}
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
          {t("register.confirmPassword")}
        </label>
        <div className="mt-1.5">
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            placeholder={t("register.confirmPlaceholder")}
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
          messages={confirmMismatch ? [t("register.passwordsMismatch")] : fieldErrors.confirmPassword}
        />
      </div>

      {/* Живая индикация требований к паролю — по макету "Пароль должен содержать". */}
      <div className="rounded-lg bg-brand-50/60 px-4 py-3.5">
        <p className="text-sm font-medium text-ink">{t("password.title")}</p>
        <ul className="mt-2 space-y-1.5" aria-live="polite">
          {passwordRequirements.map((req) => {
            const ok = req.test(password);
            return (
              <li
                key={req.key}
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
                {t(`password.${req.key}`)}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <label className="flex items-start gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            name="agree"
            required
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-600 focus:ring-brand-500"
            aria-invalid={Boolean(fieldErrors.agree?.length)}
            aria-describedby={fieldErrors.agree?.length ? "agree-error" : undefined}
          />
          <span>
            {t("register.agreePrefix")}{" "}
            <Link href="/terms" className="font-medium text-brand-600 hover:text-brand-700">
              {t("register.agreeTerms")}
            </Link>{" "}
            {t("register.agreeAnd")}{" "}
            <Link href="/privacy" className="font-medium text-brand-600 hover:text-brand-700">
              {t("register.agreePrivacy")}
            </Link>
          </span>
        </label>
        <FieldError id="agree-error" messages={fieldErrors.agree} />
      </div>

      <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
        {pending ? t("register.pending") : t("register.submit")}
      </Button>

      <p className="text-center text-sm text-muted">
        {t("register.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          {t("register.login")}
        </Link>
      </p>
    </form>
  );
}
