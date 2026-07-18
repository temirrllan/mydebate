"use client";

import { Link2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/auth/field-error";
import { InstagramIcon, TelegramIcon } from "@/components/icons/social";
import { RegistrationType } from "@/lib/enums";
import { cn } from "@/lib/utils";
import type { FieldErrors, WizardUpdate, WizardValues } from "./types";

const REGISTRATION_TYPE_LABEL: Record<string, string> = {
  [RegistrationType.PLATFORM]: "Регистрация на платформе MyDebate",
  [RegistrationType.EXTERNAL]: "Регистрация по внешней ссылке",
};

const REGISTRATION_TYPE_HINT: Record<string, string> = {
  [RegistrationType.PLATFORM]: "Участники подают заявку прямо на MyDebate.",
  [RegistrationType.EXTERNAL]: "Участники переходят по вашей ссылке (Google-форма, сайт и т.п.).",
};

/** Шаг 3 мастера создания турнира — способ регистрации и контакты организатора. */
export function Step3Contacts({
  values,
  errors,
  update,
}: {
  values: WizardValues;
  errors: FieldErrors;
  update: WizardUpdate;
}) {
  return (
    <div className="space-y-6">
      <div role="group" aria-labelledby="registrationType-group-label">
        <span id="registrationType-group-label" className="text-sm font-medium text-ink">
          Способ регистрации <span className="text-rose-500">*</span>
        </span>
        <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
          {Object.values(RegistrationType).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => update("registrationType", type)}
              aria-pressed={values.registrationType === type}
              className={cn(
                "rounded-[var(--radius-btn)] border p-4 text-left transition-colors",
                values.registrationType === type
                  ? "border-brand-600 bg-brand-50"
                  : "border-line bg-white hover:border-brand-300",
              )}
            >
              <p className={cn("text-sm font-semibold", values.registrationType === type ? "text-brand-700" : "text-ink")}>
                {REGISTRATION_TYPE_LABEL[type]}
              </p>
              <p className="mt-1 text-xs text-muted">{REGISTRATION_TYPE_HINT[type]}</p>
            </button>
          ))}
        </div>
        <FieldError messages={errors.registrationType} />
      </div>

      {values.registrationType === RegistrationType.EXTERNAL && (
        <div>
          <label htmlFor="externalUrl" className="text-sm font-medium text-ink">
            Ссылка на внешнюю регистрацию <span className="text-rose-500">*</span>
          </label>
          <div className="relative mt-1.5">
            <Link2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              id="externalUrl"
              type="url"
              value={values.externalUrl}
              onChange={(e) => update("externalUrl", e.target.value)}
              placeholder="https://forms.gle/..."
              className="pl-10"
              invalid={Boolean(errors.externalUrl?.length)}
              aria-invalid={Boolean(errors.externalUrl?.length)}
              aria-describedby={errors.externalUrl?.length ? "externalUrl-error" : undefined}
            />
          </div>
          <FieldError id="externalUrl-error" messages={errors.externalUrl} />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="email" className="text-sm font-medium text-ink">
            Контактный email <span className="text-muted">(необязательно)</span>
          </label>
          <div className="relative mt-1.5">
            <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              id="email"
              type="email"
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="team@mydebate.kz"
              className="pl-10"
              invalid={Boolean(errors.email?.length)}
              aria-invalid={Boolean(errors.email?.length)}
              aria-describedby={errors.email?.length ? "contactEmail-field-error" : undefined}
            />
          </div>
          <FieldError id="contactEmail-field-error" messages={errors.email} />
        </div>

        <div>
          <label htmlFor="instagram" className="text-sm font-medium text-ink">
            Instagram <span className="text-muted">(необязательно)</span>
          </label>
          <div className="relative mt-1.5">
            <InstagramIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" width={16} height={16} />
            <Input
              id="instagram"
              value={values.instagram}
              onChange={(e) => update("instagram", e.target.value)}
              placeholder="@mydebate"
              className="pl-10"
              aria-describedby={errors.instagram?.length ? "instagram-error" : undefined}
            />
          </div>
          <FieldError id="instagram-error" messages={errors.instagram} />
        </div>

        <div>
          <label htmlFor="telegram" className="text-sm font-medium text-ink">
            Telegram <span className="text-muted">(необязательно)</span>
          </label>
          <div className="relative mt-1.5">
            <TelegramIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" width={16} height={16} />
            <Input
              id="telegram"
              value={values.telegram}
              onChange={(e) => update("telegram", e.target.value)}
              placeholder="@mydebate_kz"
              className="pl-10"
              aria-describedby={errors.telegram?.length ? "telegram-error" : undefined}
            />
          </div>
          <FieldError id="telegram-error" messages={errors.telegram} />
        </div>
      </div>
    </div>
  );
}
