"use client";

import { useActionState, useRef, useState } from "react";
import { Megaphone, Send, CheckCircle2, ChevronDown, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/auth/field-error";
import { announceToParticipants } from "@/lib/actions/announcements";
import { REG_STATUS_ORDER } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

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
/**
 * Заготовки сообщений — только ИДЕНТИФИКАТОРЫ. Тема и текст живут в словаре
 * (namespace "announcementTemplates", ключи `<id>Subject` и `<id>Body`):
 * организатор пишет участникам на языке своего интерфейса, а тексты длинные
 * и держать их тремя копиями в коде нельзя.
 *
 * `{tournament}` в теле подставляется названием турнира при вставке шаблона.
 * Многоточия «…» намеренные: это места, которые организатор должен дописать,
 * и их видно с первого взгляда.
 */
const TEMPLATE_IDS = ["chat", "announcement", "schedule", "payment", "thanks"] as const;

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
  const t = useTranslations("participants");
  const tTpl = useTranslations("announcementTemplates");
  const tEnum = useTranslations("enums");
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

  function applyTemplate(id: (typeof TEMPLATE_IDS)[number]) {
    setSubject(tTpl(`${id}Subject`));
    setMessage(tTpl(`${id}Body`, { tournament: tournamentTitle }));
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
          <span className="block font-semibold text-ink">{t("announceTitle")}</span>
          <span className="block text-sm text-muted">
            {t("announceHint")}
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
              {t("announceSent", { count: state.recipients ?? 0 })}
            </p>
          )}
          {state?.message && !state.success && (
            <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {state.message}
            </p>
          )}

          <div>
            <span className="text-sm font-medium text-ink">{t("template")}</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {TEMPLATE_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyTemplate(id)}
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-700"
                >
                  {t(`tpl${id.charAt(0).toUpperCase()}${id.slice(1)}`)}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {t("templateHint")}
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-[1fr_220px]">
            <div>
              <label htmlFor="announcement-subject" className="text-sm font-medium text-ink">
                {t("subject")} <span className="text-rose-500">*</span>
              </label>
              <Input
                id="announcement-subject"
                name="subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("subjectPlaceholder")}
                className="mt-1.5"
                invalid={Boolean(fieldErrors.subject?.length)}
                aria-invalid={Boolean(fieldErrors.subject?.length)}
                aria-describedby={fieldErrors.subject?.length ? "announcement-subject-error" : undefined}
              />
              <FieldError id="announcement-subject-error" messages={fieldErrors.subject} />
            </div>

            <div>
              <label htmlFor="announcement-audience" className="text-sm font-medium text-ink">
                {t("audience")}
              </label>
              <div className="mt-1.5">
                <Select
                  id="announcement-audience"
                  name="audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                >
                  <option value={ALL}>{t("audienceAll", { count: total })}</option>
                  {REG_STATUS_ORDER.filter((s) => (counts[s] ?? 0) > 0).map((s) => (
                    <option key={s} value={s}>
                      {t("audienceStatus", { label: tEnum(`regStatus.${s}`), count: counts[s] ?? 0 })}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="announcement-message" className="text-sm font-medium text-ink">
              {t("message")} <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="announcement-message"
              name="message"
              ref={messageRef}
              required
              rows={9}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
              placeholder={t("messagePlaceholder")}
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
              {pending ? t("sending") : t("send")}
            </Button>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted">
              <Users size={15} /> {t("willReceive", { count: recipientCount })}
            </span>
          </div>
        </form>
      )}
    </Card>
  );
}

