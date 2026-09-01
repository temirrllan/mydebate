"use client";

import { Link2, Mail, CreditCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FieldError } from "@/components/auth/field-error";
import { InstagramIcon, TelegramIcon, TikTokIcon } from "@/components/icons/social";
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

      {/* Реквизиты для оплаты взноса. Показываем только когда они реально
          нужны: турнир платный И участник платит через платформу. Для
          бесплатного турнира или внешней регистрации блок не нужен и только
          отвлекал бы. Цена живёт на шаге 1, поэтому читаем её из values. */}
      {values.registrationType === RegistrationType.PLATFORM && Number(values.price) > 0 && (
        <div className="rounded-[var(--radius-card)] border border-line bg-canvas p-5">
          <div className="flex items-start gap-3">
            <CreditCard size={18} className="mt-0.5 shrink-0 text-brand-600" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Реквизиты для оплаты взноса</h3>
              <p className="mt-1 text-sm text-muted">
                Участник увидит их при регистрации и приложит чек об оплате. Деньги приходят
                напрямую вам — платформа платежи не проводит.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="paymentMethod" className="text-sm font-medium text-ink">
                Способ оплаты
              </label>
              <Input
                id="paymentMethod"
                value={values.paymentMethod}
                onChange={(e) => update("paymentMethod", e.target.value)}
                placeholder="Kaspi"
                className="mt-1.5"
                aria-describedby={errors.paymentMethod?.length ? "paymentMethod-error" : undefined}
              />
              <FieldError id="paymentMethod-error" messages={errors.paymentMethod} />
            </div>

            <div>
              <label htmlFor="paymentAccount" className="text-sm font-medium text-ink">
                Номер карты или телефона <span className="text-rose-500">*</span>
              </label>
              <Input
                id="paymentAccount"
                value={values.paymentAccount}
                onChange={(e) => update("paymentAccount", e.target.value)}
                placeholder="+7 701 272 0010"
                className="mt-1.5"
                invalid={Boolean(errors.paymentAccount?.length)}
                aria-invalid={Boolean(errors.paymentAccount?.length)}
                aria-describedby={errors.paymentAccount?.length ? "paymentAccount-error" : undefined}
              />
              <FieldError id="paymentAccount-error" messages={errors.paymentAccount} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="paymentRecipient" className="text-sm font-medium text-ink">
                ФИО получателя <span className="text-rose-500">*</span>
              </label>
              <Input
                id="paymentRecipient"
                value={values.paymentRecipient}
                onChange={(e) => update("paymentRecipient", e.target.value)}
                placeholder="Иванов Иван Иванович"
                className="mt-1.5"
                invalid={Boolean(errors.paymentRecipient?.length)}
                aria-invalid={Boolean(errors.paymentRecipient?.length)}
                aria-describedby={
                  errors.paymentRecipient?.length ? "paymentRecipient-error" : undefined
                }
              />
              <FieldError id="paymentRecipient-error" messages={errors.paymentRecipient} />
              <p className="mt-1.5 text-xs text-muted">
                На чьё имя придёт перевод — участник сверит его перед оплатой.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Контакты. Ник можно писать как угодно — «@mydebate», «mydebate»,
          «instagram.com/mydebate»: в рабочую ссылку это превращает
          normalizeSocialUrl (lib/social.ts) на странице турнира. */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
          <label htmlFor="tiktok" className="text-sm font-medium text-ink">
            TikTok <span className="text-muted">(необязательно)</span>
          </label>
          <div className="relative mt-1.5">
            <TikTokIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" width={16} height={16} />
            <Input
              id="tiktok"
              value={values.tiktok}
              onChange={(e) => update("tiktok", e.target.value)}
              placeholder="@mydebate"
              className="pl-10"
              aria-describedby={errors.tiktok?.length ? "tiktok-error" : undefined}
            />
          </div>
          <FieldError id="tiktok-error" messages={errors.tiktok} />
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
