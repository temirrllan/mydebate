"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Send, User, Mail, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/auth/field-error";
import { createSupportTicket } from "@/lib/actions/support";
// ВАЖНО: SUPPORT_TICKET_SUCCESS_MESSAGE (константа) намеренно НЕ импортируется
// сюда — "use server" файлы в этой версии Next/Turbopack могут экспортировать
// только async-функции, если модуль попадает в клиентский бандл (а
// createSupportTicket именно так и используется, см. register-form.tsx для
// того же паттерна). Текст успеха всегда приходит из `state.message`.

const initialState = undefined;
const MIN_MESSAGE_LENGTH = 20;

/**
 * Форма «Напишите нам» на /contacts (Этап 7, фича 1). Работает и для гостя, и
 * для авторизованного пользователя — для авторизованного имя/email
 * преднаполняются его профилем (проп defaultName/defaultEmail), но остаются
 * редактируемыми обычными полями формы (сервер валидирует то, что реально
 * прислано, а не тянет данные из сессии напрямую).
 */
export function ContactForm({
  defaultName = "",
  defaultEmail = "",
}: {
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [state, formAction, pending] = useActionState(createSupportTicket, initialState);
  const [message, setMessage] = useState("");

  const fieldErrors = state?.fieldErrors ?? {};

  if (state?.success) {
    return (
      <Card role="status" className="p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={30} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-navy-900">Спасибо за обращение!</h2>
        <p className="mt-2 text-muted">{state.message}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-lg font-bold text-navy-900">Напишите нам</h2>
      <p className="mt-1 text-sm text-muted">
        Опишите вопрос или проблему — мы ответим на указанный вами email.
      </p>

      <form action={formAction} noValidate className="mt-6 space-y-5">
        {state?.message && !state.success && (
          <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
            ❌ {state.message}
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="text-sm font-medium text-ink">
              Имя <span className="text-muted">(необязательно)</span>
            </label>
            <div className="relative mt-1.5">
              <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="name"
                name="name"
                defaultValue={defaultName}
                placeholder="Введите ваше имя"
                className="pl-10"
                invalid={Boolean(fieldErrors.name?.length)}
                aria-invalid={Boolean(fieldErrors.name?.length)}
                aria-describedby={fieldErrors.name?.length ? "name-error" : undefined}
              />
            </div>
            <FieldError id="name-error" messages={fieldErrors.name} />
          </div>

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
                defaultValue={defaultEmail}
                placeholder="example@mail.com"
                className="pl-10"
                invalid={Boolean(fieldErrors.email?.length)}
                aria-invalid={Boolean(fieldErrors.email?.length)}
                aria-describedby={fieldErrors.email?.length ? "email-error" : undefined}
              />
            </div>
            <FieldError id="email-error" messages={fieldErrors.email} />
          </div>
        </div>

        <div>
          <label htmlFor="subject" className="text-sm font-medium text-ink">
            Тема <span className="text-rose-500">*</span>
          </label>
          <div className="mt-1.5">
            <Input
              id="subject"
              name="subject"
              required
              placeholder="Кратко опишите тему обращения"
              invalid={Boolean(fieldErrors.subject?.length)}
              aria-invalid={Boolean(fieldErrors.subject?.length)}
              aria-describedby={fieldErrors.subject?.length ? "subject-error" : undefined}
            />
          </div>
          <FieldError id="subject-error" messages={fieldErrors.subject} />
        </div>

        <div>
          <label htmlFor="message" className="text-sm font-medium text-ink">
            Сообщение <span className="text-rose-500">*</span>
          </label>
          <div className="relative mt-1.5">
            <MessageSquare
              size={16}
              className="pointer-events-none absolute left-3.5 top-3 text-muted"
            />
            <textarea
              id="message"
              name="message"
              required
              rows={5}
              maxLength={3000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Опишите ваш вопрос или проблему подробнее…"
              className="w-full rounded-[var(--radius-btn)] border border-line bg-white py-2.5 pl-10 pr-3.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              aria-invalid={Boolean(fieldErrors.message?.length)}
              aria-describedby={fieldErrors.message?.length ? "message-error" : undefined}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <FieldError id="message-error" messages={fieldErrors.message} />
            <span
              className={`ml-auto text-xs ${message.trim().length < MIN_MESSAGE_LENGTH ? "text-muted" : "text-emerald-600"}`}
            >
              {message.length}/{MIN_MESSAGE_LENGTH} минимум
            </span>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full justify-center sm:w-auto" disabled={pending}>
          {pending ? (
            "Отправляем…"
          ) : (
            <>
              <Send size={18} /> Отправить сообщение
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
