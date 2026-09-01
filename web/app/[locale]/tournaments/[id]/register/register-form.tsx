"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CheckCircle2, Send, User, GraduationCap, School, Phone, Mail, Users2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError } from "@/components/auth/field-error";
import { registerForTournament } from "@/lib/actions/registrations";
// ВАЖНО: REGISTRATION_SUCCESS_MESSAGE (константа) намеренно НЕ импортируется
// сюда — "use server" файлы в этой версии Next/Turbopack могут экспортировать
// только async-функции, если модуль попадает в клиентский бандл (а
// registerForTournament именно так и используется). Текст успеха всегда
// приходит из `state.message`, которое сервер заполняет этой же константой.
import { Level } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { PaymentSection } from "./payment-section";

const initialState = undefined;

/** Комитет MUN = раздел турнира: то, что организатор ввёл на шаге «Разделы». */
export type Committee = { title: string; description: string };

export function RegisterForm({
  tournamentId,
  tournamentTitle,
  languages,
  committees = [],
  defaultFullName,
  defaultEmail,
  defaultPhone = "",
  alreadyRegistered = false,
  isMun = false,
  payment,
}: {
  tournamentId: string;
  tournamentTitle: string;
  languages: string[];
  /**
   * Комитеты MUN — разделы турнира, которые организатор завёл при создании
   * (UNHRC, WHO, UNEP, …), вместе с их описанием. Используются только при
   * isMun; пустой список означает, что разделов у турнира нет и выбирать не
   * из чего.
   *
   * Описание нужно именно здесь: раньше форма показывала один заголовок, и
   * участник выбирал комитет вслепую — чтобы прочитать повестку, надо было
   * уходить обратно на страницу турнира.
   */
  committees?: Committee[];
  defaultFullName: string;
  defaultEmail: string;
  defaultPhone?: string;
  alreadyRegistered?: boolean;
  /**
   * Турнир формата MUN. На таких участник регистрируется делегатом, а не
   * командой, поэтому в блоке «Информация об участии» скрыты «Название
   * команды» и «Имена тиммейтов», а вместо «Предпочитаемого языка» стоит
   * «Выбор комитета» (список из `committees`); всё остальное — как у
   * дебатов. То же правило продублировано на сервере
   * (lib/actions/registrations.ts): форма решает, что показать, а не что
   * разрешено сохранить.
   */
  isMun?: boolean;
  /** Реквизиты оплаты. null — турнир бесплатный, блок оплаты не показываем. */
  payment?: {
    price: number;
    method: string | null;
    account: string | null;
    recipient: string | null;
  } | null;
}) {
  const t = useTranslations("registration");
  const tEnum = useTranslations("enums");
  const boundAction = registerForTournament.bind(null, tournamentId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [additionalInfo, setAdditionalInfo] = useState("");

  const fieldErrors = state?.fieldErrors ?? {};

  // Приоритет — только что отправленной заявке. Экшен вызывает
  // revalidatePath, из-за чего родительский Server Component перерисовывается
  // и прокидывает alreadyRegistered=true; но клиентский state.success
  // сохраняется (компонент не размонтируется) и остаётся главнее — иначе
  // пользователь после успешной отправки видел бы «Вы уже зарегистрированы»
  // вместо благодарности.
  if (state?.success) {
    return (
      <Card className="p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={30} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-navy-900">{t("sentTitle")}</h2>
        <p className="mt-2 text-muted">{state.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/profile?tab=applications">{t("myApplications")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/tournaments/${tournamentId}`}>{t("toTournament")}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  if (alreadyRegistered) {
    return (
      <Card className="p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Info size={30} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-navy-900">{t("alreadyTitle")}</h2>
        <p className="mt-2 text-muted">{t("alreadyText")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/profile?tab=applications">{t("myApplications")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/tournaments/${tournamentId}`}>{t("toTournament")}</Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-6">
      {state?.message && !state.success && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          ❌ {state.message}
        </p>
      )}

      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <User size={18} />
          </div>
          <h2 className="text-lg font-bold text-navy-900">{t("step1")}</h2>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="fullName" className="text-sm font-medium text-ink">
              {t("fullName")} <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="fullName"
                name="fullName"
                required
                defaultValue={defaultFullName}
                placeholder={t("fullNamePlaceholder")}
                className="pl-10"
                invalid={Boolean(fieldErrors.fullName?.length)}
                aria-invalid={Boolean(fieldErrors.fullName?.length)}
                aria-describedby={fieldErrors.fullName?.length ? "fullName-error" : undefined}
              />
            </div>
            <FieldError id="fullName-error" messages={fieldErrors.fullName} />
          </div>

          <div>
            <label htmlFor="gradeOrCourse" className="text-sm font-medium text-ink">
              {t("grade")} <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <GraduationCap
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
              />
              <Input
                id="gradeOrCourse"
                name="gradeOrCourse"
                required
                placeholder={t("gradePlaceholder")}
                className="pl-10"
                invalid={Boolean(fieldErrors.gradeOrCourse?.length)}
                aria-invalid={Boolean(fieldErrors.gradeOrCourse?.length)}
                aria-describedby={
                  fieldErrors.gradeOrCourse?.length ? "gradeOrCourse-error" : undefined
                }
              />
            </div>
            <FieldError id="gradeOrCourse-error" messages={fieldErrors.gradeOrCourse} />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="schoolOrUniversity" className="text-sm font-medium text-ink">
              {t("school")} <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <School size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="schoolOrUniversity"
                name="schoolOrUniversity"
                required
                placeholder={t("schoolPlaceholder")}
                className="pl-10"
                invalid={Boolean(fieldErrors.schoolOrUniversity?.length)}
                aria-invalid={Boolean(fieldErrors.schoolOrUniversity?.length)}
                aria-describedby={
                  fieldErrors.schoolOrUniversity?.length ? "schoolOrUniversity-error" : undefined
                }
              />
            </div>
            <FieldError id="schoolOrUniversity-error" messages={fieldErrors.schoolOrUniversity} />
          </div>

          <div>
            <label htmlFor="phone" className="text-sm font-medium text-ink">
              {t("phone")} <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <Phone size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="phone"
                name="phone"
                type="tel"
                required
                defaultValue={defaultPhone}
                placeholder={t("phonePlaceholder")}
                className="pl-10"
                invalid={Boolean(fieldErrors.phone?.length)}
                aria-invalid={Boolean(fieldErrors.phone?.length)}
                aria-describedby={fieldErrors.phone?.length ? "phone-error" : undefined}
              />
            </div>
            <FieldError id="phone-error" messages={fieldErrors.phone} />
          </div>

          <div>
            <label htmlFor="contactEmail" className="text-sm font-medium text-ink">
              Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative mt-1.5">
              <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                required
                defaultValue={defaultEmail}
                placeholder="example@mail.com"
                className="pl-10"
                invalid={Boolean(fieldErrors.contactEmail?.length)}
                aria-invalid={Boolean(fieldErrors.contactEmail?.length)}
                aria-describedby={
                  fieldErrors.contactEmail?.length ? "contactEmail-error" : undefined
                }
              />
            </div>
            <FieldError id="contactEmail-error" messages={fieldErrors.contactEmail} />
          </div>
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Users2 size={18} />
          </div>
          <h2 className="text-lg font-bold text-navy-900">{t("step2")}</h2>
        </div>

        <div className="mt-5 space-y-5">
          {/* Команда и тиммейты — только для дебатов: на MUN участник едет
              делегатом, команд там нет. */}
          {!isMun && (
            <>
              <div>
                <label htmlFor="teamName" className="text-sm font-medium text-ink">
                  {t("teamName")} <span className="text-rose-500">*</span>
                </label>
                <div className="mt-1.5">
                  <Input
                    id="teamName"
                    name="teamName"
                    required
                    placeholder={t("teamNamePlaceholder")}
                    invalid={Boolean(fieldErrors.teamName?.length)}
                    aria-invalid={Boolean(fieldErrors.teamName?.length)}
                    aria-describedby={fieldErrors.teamName?.length ? "teamName-error" : undefined}
                  />
                </div>
                <FieldError id="teamName-error" messages={fieldErrors.teamName} />
              </div>

              <div>
                <label htmlFor="teammateNames" className="text-sm font-medium text-ink">
                  {t("teammates")} <span className="text-muted">{t("teammatesHint")}</span>
                </label>
                <div className="mt-1.5">
                  <textarea
                    id="teammateNames"
                    name="teammateNames"
                    rows={2}
                    placeholder={t("teammatesPlaceholder")}
                    className="w-full rounded-[var(--radius-btn)] border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    aria-describedby={
                      fieldErrors.teammateNames?.length ? "teammateNames-error" : undefined
                    }
                  />
                </div>
                <FieldError id="teammateNames-error" messages={fieldErrors.teammateNames} />
              </div>
            </>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="experienceLevel" className="text-sm font-medium text-ink">
                {t("experience")} <span className="text-muted">{t("optional")}</span>
              </label>
              <div className="mt-1.5">
                <Select
                  id="experienceLevel"
                  name="experienceLevel"
                  defaultValue=""
                  aria-describedby={
                    fieldErrors.experienceLevel?.length ? "experienceLevel-error" : undefined
                  }
                >
                  <option value="">{t("experiencePlaceholder")}</option>
                  {Object.values(Level).map((l) => (
                    <option key={l} value={l}>
                      {tEnum(`level.${l}`)}
                    </option>
                  ))}
                </Select>
              </div>
              <FieldError id="experienceLevel-error" messages={fieldErrors.experienceLevel} />
            </div>

            {/* Язык — только у дебатов. На MUN его место занимает выбор
                комитета, но тот идёт отдельным блоком во всю ширину (ниже):
                у комитета есть описание, и в половину строки оно не влезает. */}
            {!isMun && (
              <div>
                <label htmlFor="preferredLanguage" className="text-sm font-medium text-ink">
                  {t("language")} <span className="text-rose-500">*</span>
                </label>
                <div className="mt-1.5">
                  <Select
                    id="preferredLanguage"
                    name="preferredLanguage"
                    required
                    defaultValue=""
                    invalid={Boolean(fieldErrors.preferredLanguage?.length)}
                    aria-invalid={Boolean(fieldErrors.preferredLanguage?.length)}
                    aria-describedby={
                      fieldErrors.preferredLanguage?.length ? "preferredLanguage-error" : undefined
                    }
                  >
                    <option value="" disabled>
                      {t("languagePlaceholder")}
                    </option>
                    {(languages.length > 0 ? languages : ["Казакша", "Русский", "English"]).map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </Select>
                </div>
                <FieldError id="preferredLanguage-error" messages={fieldErrors.preferredLanguage} />
              </div>
            )}
          </div>

          {/* Выбор комитета (MUN). Если разделов у турнира нет — выбирать не
              из чего, блок не рендерим, и сервер комитет в этом случае не
              требует (см. lib/actions/registrations.ts). */}
          {isMun && committees.length > 0 && (
            <CommitteePicker committees={committees} errors={fieldErrors.committee} />
          )}

          <div>
            <label htmlFor="additionalInfo" className="text-sm font-medium text-ink">
              {t("additionalInfo")} <span className="text-muted">{t("optional")}</span>
            </label>
            <div className="relative mt-1.5">
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                rows={3}
                maxLength={500}
                placeholder={t("additionalInfo")}
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                className="w-full rounded-[var(--radius-btn)] border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                aria-describedby={
                  fieldErrors.additionalInfo?.length ? "additionalInfo-error" : undefined
                }
              />
              <span className="pointer-events-none absolute bottom-2.5 right-3 text-xs text-muted">
                {additionalInfo.length}/500
              </span>
            </div>
            <FieldError id="additionalInfo-error" messages={fieldErrors.additionalInfo} />
          </div>
        </div>
      </Card>

      {payment && (
        <PaymentSection
          price={payment.price}
          paymentMethod={payment.method}
          paymentAccount={payment.account}
          paymentRecipient={payment.recipient}
          errors={fieldErrors.receiptUrl}
        />
      )}

      <Card className="p-6 sm:p-8">
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
            {t("agreePrefix")}{" "}
            <Link href="/rules" className="font-medium text-brand-600 hover:text-brand-700">
              {t("agreeRules")}
            </Link>{" "}
            {t("agreeAnd")}{" "}
            <Link href="/privacy" className="font-medium text-brand-600 hover:text-brand-700">
              {t("agreePrivacy")}
            </Link>
            .
          </span>
        </label>
        <FieldError id="agree-error" messages={fieldErrors.agree} />
      </Card>

      <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
        {pending ? (
          t("submitPending")
        ) : (
          <>
            <Send size={18} /> {t("submit", { title: tournamentTitle })}
          </>
        )}
      </Button>
    </form>
  );
}

/**
 * Выбор комитета MUN — карточки с названием и описанием, которое организатор
 * написал в разделе турнира (повестка, язык работы, требования к делегатам).
 *
 * Раньше здесь был обычный <select> с одними заголовками («UNHRC», «WHO»), и
 * участник выбирал вслепую: чтобы прочитать, о чём комитет, приходилось
 * возвращаться на страницу турнира и терять заполненную форму.
 *
 * Радиокнопки настоящие, а не div'ы с onClick: так работают стрелки на
 * клавиатуре, скринридер объявляет «группа, 2 из 5», а браузер сам не даёт
 * отправить форму без выбора (required). Подсветка выбранной карточки — на
 * `has-[:checked]`, поэтому состояние не приходится дублировать в useState.
 */
function CommitteePicker({
  committees,
  errors,
}: {
  committees: Committee[];
  errors?: string[];
}) {
  const t = useTranslations("registration");
  const invalid = Boolean(errors?.length);

  return (
    <fieldset aria-describedby={invalid ? "committee-error" : undefined}>
      <legend className="text-sm font-medium text-ink">
        {t("committee")} <span className="text-rose-500">*</span>
      </legend>
      <p className="mt-1 text-sm text-muted">
        {t("committeeHint")}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {committees.map((committee) => (
          <label
            key={committee.title}
            className={cn(
              "flex cursor-pointer gap-3 rounded-[var(--radius-card)] border bg-white p-4 transition-colors",
              "hover:border-brand-300 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/40",
              invalid ? "border-rose-300" : "border-line",
            )}
          >
            <input
              type="radio"
              name="committee"
              value={committee.title}
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
            />
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{committee.title}</span>
              <span className="mt-1 block whitespace-pre-line text-sm leading-relaxed text-muted">
                {committee.description}
              </span>
            </span>
          </label>
        ))}
      </div>

      <FieldError id="committee-error" messages={errors} />
    </fieldset>
  );
}
