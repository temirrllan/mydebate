"use client";

import { useActionState, useRef, useState } from "react";
import { Megaphone, Send, CheckCircle2, ChevronDown, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/auth/field-error";
import { announceToParticipants } from "@/lib/actions/announcements";
import { REG_STATUS_SHORT_LABEL, REG_STATUS_ORDER } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Совпадает с ANNOUNCEMENT_AUDIENCE_ALL из lib/validations/announcement.ts.
 *  Продублировано строкой, а не импортом: схема валидации тянет за собой zod
 *  и серверные enum'ы в клиентский бандл ради одного слова. */
const ALL = "ALL";

const MESSAGE_MAX = 4000;

/**
 * Заготовки сообщений. Организаторы пишут участникам одно и то же из турнира
 * в турнир (позвать в чат, напомнить про взнос, объявить расписание), поэтому
 * заполняем за них тему и каркас текста — остаётся вставить свою ссылку.
 *
 * `{tournament}` подставляется названием турнира при вставке шаблона.
 * Многоточия «…» намеренные: это места, которые организатор должен дописать,
 * и их видно с первого взгляда.
 */
const TEMPLATES: { id: string; label: string; subject: string; body: string }[] = [
  {
    id: "chat",
    label: "Чат турнира",
    subject: "Присоединяйтесь к чату турнира",
    body: `Здравствуйте!

Вы зарегистрированы на турнир «{tournament}». Вся оперативная информация — в нашей группе:

…вставьте ссылку на WhatsApp-группу…

Пожалуйста, вступите в неё до начала турнира: там будут расписание, изменения и ответы на вопросы.`,
  },
  {
    id: "announcement",
    label: "Важное объявление",
    subject: "Важное объявление по турниру",
    body: `Здравствуйте!

Сообщаем важную информацию по турниру «{tournament}»:

…текст объявления…

Спасибо за внимание!`,
  },
  {
    id: "schedule",
    label: "Расписание и место",
    subject: "Расписание и место проведения",
    body: `Здравствуйте!

Публикуем детали проведения турнира «{tournament}».

Дата и время сбора: …
Место проведения: …
При себе иметь: …

Просим приходить за 30 минут до начала регистрации на площадке.`,
  },
  {
    id: "payment",
    label: "Напоминание об оплате",
    subject: "Напоминание об оплате взноса",
    body: `Здравствуйте!

Напоминаем об оплате организационного взноса за участие в турнире «{tournament}».

Реквизиты: …
Срок оплаты: …

После оплаты, пожалуйста, пришлите чек, если ещё не приложили его к заявке.`,
  },
  {
    id: "thanks",
    label: "Благодарность",
    subject: "Спасибо за участие!",
    body: `Здравствуйте!

Спасибо, что были частью турнира «{tournament}»! Нам было приятно видеть вас среди участников.

…итоги, ссылки на фотографии, анонс следующего турнира…

До встречи на следующих турнирах!`,
  },
];

/**
 * Рассылка участникам — организатор пишет одно сообщение, и оно уходит всем
 * зарегистрированным: и уведомлением в личный кабинет, и письмом на почту.
 * Живёт на /tournaments/[id]/participants, внутри ParticipantsManager, чтобы
 * счётчики аудитории брались из того же (живого) списка заявок.
 *
 * Свёрнута по умолчанию: основная работа на этой странице — разбор заявок,
 * рассылка нужна изредка и не должна отжимать список вниз.
 */
export function AnnouncementPanel({
  tournamentId,
  tournamentTitle,
  counts,
  total,
}: {
  tournamentId: string;
  tournamentTitle: string;
  /** Количество заявок по статусам — для подписи «кому уйдёт». */
  counts: Record<string, number>;
  total: number;
}) {
  const boundAction = announceToParticipants.bind(null, tournamentId);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState(ALL);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const fieldErrors = state?.fieldErrors ?? {};
  const recipientCount = audience === ALL ? total : (counts[audience] ?? 0);

  // После успешной отправки очищаем поля — иначе достаточно случайного
  // повторного нажатия, чтобы участники получили то же сообщение дважды.
  //
  // Правим состояние прямо в рендере (документированный React-паттерн
  // «adjusting state when props change»), а не в useEffect: эффект здесь
  // означал бы лишний проход рендера с уже отправленным текстом в полях.
  // `sentState` хранит именно объект состояния, а не флаг: у следующей
  // рассылки success тоже true, и по флагу сброс бы не повторился.
  const [sentState, setSentState] = useState<typeof state>(undefined);
  if (state?.success && state !== sentState) {
    setSentState(state);
    setSubject("");
    setMessage("");
  }

  function applyTemplate(template: (typeof TEMPLATES)[number]) {
    setSubject(template.subject);
    setMessage(template.body.replaceAll("{tournament}", tournamentTitle));
    messageRef.current?.focus();
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-5 text-left transition-colors hover:bg-canvas"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Megaphone size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-ink">Написать участникам</span>
          <span className="block text-sm text-muted">
            Сообщение придёт всем выбранным участникам — в личный кабинет и на почту.
          </span>
        </span>
        <ChevronDown
          size={18}
          className={cn("shrink-0 text-muted transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <form action={formAction} noValidate className="space-y-5 border-t border-line p-5">
          {state?.success && (
            <p
              role="status"
              className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            >
              <CheckCircle2 size={16} className="shrink-0" />
              Сообщение отправлено: {state.recipients} {pluralizeRecipient(state.recipients ?? 0)}.
            </p>
          )}
          {state?.message && !state.success && (
            <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {state.message}
            </p>
          )}

          <div>
            <span className="text-sm font-medium text-ink">Шаблон</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  {template.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              Шаблон подставит тему и каркас текста — допишите детали перед отправкой.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-[1fr_220px]">
            <div>
              <label htmlFor="announcement-subject" className="text-sm font-medium text-ink">
                Тема <span className="text-rose-500">*</span>
              </label>
              <Input
                id="announcement-subject"
                name="subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Например: Присоединяйтесь к чату турнира"
                className="mt-1.5"
                invalid={Boolean(fieldErrors.subject?.length)}
                aria-invalid={Boolean(fieldErrors.subject?.length)}
                aria-describedby={fieldErrors.subject?.length ? "announcement-subject-error" : undefined}
              />
              <FieldError id="announcement-subject-error" messages={fieldErrors.subject} />
            </div>

            <div>
              <label htmlFor="announcement-audience" className="text-sm font-medium text-ink">
                Кому
              </label>
              <div className="mt-1.5">
                <Select
                  id="announcement-audience"
                  name="audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                >
                  <option value={ALL}>Все участники ({total})</option>
                  {REG_STATUS_ORDER.filter((s) => (counts[s] ?? 0) > 0).map((s) => (
                    <option key={s} value={s}>
                      {REG_STATUS_SHORT_LABEL[s] ?? s} ({counts[s]})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="announcement-message" className="text-sm font-medium text-ink">
              Сообщение <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="announcement-message"
              name="message"
              ref={messageRef}
              required
              rows={9}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
              placeholder="Текст сообщения. Ссылки можно вставлять как есть — в письме они станут кликабельными."
              className={cn(
                "mt-1.5 w-full rounded-[var(--radius-btn)] border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted",
                "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40",
                fieldErrors.message?.length ? "border-rose-400" : "border-line",
              )}
              aria-invalid={Boolean(fieldErrors.message?.length)}
              aria-describedby={fieldErrors.message?.length ? "announcement-message-error" : undefined}
            />
            <div className="mt-1 flex items-start justify-between gap-3">
              <FieldError id="announcement-message-error" messages={fieldErrors.message} />
              <span className="shrink-0 text-xs text-muted">
                {message.length} / {MESSAGE_MAX}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <Button type="submit" disabled={pending || recipientCount === 0}>
              <Send size={16} />
              {pending ? "Отправляем…" : "Отправить"}
            </Button>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <Users size={15} /> Получат: {recipientCount} {pluralizeRecipient(recipientCount)}
            </span>
          </div>
        </form>
      )}
    </Card>
  );
}

function pluralizeRecipient(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "участник";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "участника";
  return "участников";
}
