"use client";

import { useActionState, useRef, useState, useTransition, startTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, ClipboardCheck, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Step1BasicInfo } from "@/components/tournaments/create/step1-basic-info";
import { Step2Content } from "@/components/tournaments/create/step2-content";
import { Step3Contacts } from "@/components/tournaments/create/step3-contacts";
import { INITIAL_WIZARD_VALUES, type FieldErrors, type WizardValues } from "@/components/tournaments/create/types";
import { editTournament, deleteOwnTournament } from "@/lib/actions/tournaments";
// EDIT_TOURNAMENT_SUCCESS_MESSAGE намеренно НЕ импортируется сюда (та же
// причина, что и раньше: "use server"-файл в клиентском бандле экспортирует
// только async-функции).
import { editStep1Schema, step2Schema, step3Schema } from "@/lib/validations/tournament";
import { TournamentStatus, parseLanguages } from "@/lib/enums";
import type { TournamentEditData } from "@/lib/tournaments/queries";
import { useValidationErrors } from "@/lib/i18n/use-validation-errors";
import { useTranslations } from "next-intl";

const initialState = undefined;

/** Date -> "YYYY-MM-DD" (как хранится и как ждёт DatePicker); null -> "". */
function dateToInput(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

function buildInitialValues(t: TournamentEditData): WizardValues {
  return {
    ...INITIAL_WIZARD_VALUES,
    title: t.title,
    format: t.format,
    locationType: t.locationType,
    level: t.level ?? "",
    languages: parseLanguages(t.languages),
    city: t.city ?? "",
    address: t.address ?? "",
    venue: t.venue ?? "",
    startDate: dateToInput(t.startDate),
    endDate: dateToInput(t.endDate),
    registrationDeadline: dateToInput(t.registrationDeadline),
    price: String(t.price ?? 0),
    description: t.description,
    coverImage: t.coverImage ?? "",
    logoImage: t.logoImage ?? "",
    sections: t.sections.map((s) => ({ title: s.title, description: s.description })),
    registrationType: t.registrationType || "PLATFORM",
    externalUrl: t.externalUrl ?? "",
    paymentMethod: t.paymentMethod ?? "",
    paymentAccount: t.paymentAccount ?? "",
    paymentRecipient: t.paymentRecipient ?? "",
    instagram: t.instagram ?? "",
    telegram: t.telegram ?? "",
    tiktok: t.tiktok ?? "",
    email: t.email ?? "",
  };
}

/**
 * Полная форма редактирования турнира организатором (или админом). В отличие
 * от прежней версии (только описание) — редактируются ВСЕ поля: основная
 * информация, даты/цена/место, описание/обложка/разделы, контакты. Шаги
 * мастера создания (Step1/Step2/Step3) переиспользуются как единая
 * прокручиваемая страница, без дублирования разметки полей.
 */
export function EditTournamentForm({ tournament }: { tournament: TournamentEditData }) {
  // Схемы валидации отдают ключи, а не текст (lib/validations/*.ts): одна и та
  // же схема работает на сервере и здесь, а язык известен только при показе.
  const { translateFieldErrors } = useValidationErrors();
  const t = useTranslations("createTournament");
  const boundAction = editTournament.bind(null, tournament.id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [values, setValues] = useState<WizardValues>(() => buildInitialValues(tournament));
  const [errors, setErrors] = useState<FieldErrors>({});
  const errorBannerRef = useRef<HTMLParagraphElement>(null);

  const fieldErrors = { ...errors, ...(state?.fieldErrors ?? {}) };
  const canViewTournament = tournament.status === TournamentStatus.PUBLISHED;

  function update<K extends keyof WizardValues>(key: K, value: WizardValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  if (state?.success) {
    return (
      <Card role="status" className="p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={30} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-navy-900">{t("savedTitle")}</h2>
        <p className="mt-2 text-muted">{state.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/profile?tab=tournaments">{t("myTournaments")}</Link>
          </Button>
          {canViewTournament && (
            <Button asChild size="lg" variant="outline">
              <Link href={`/tournaments/${tournament.id}`}>{t("viewTournament")}</Link>
            </Button>
          )}
        </div>
      </Card>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Клиентская валидация теми же схемами, что и мастер (step1 — в edit-версии
    // с допуском дедлайна в прошлом). Ошибки со всех «шагов» объединяем, чтобы
    // подсветить любые поля на единой странице.
    const s1 = editStep1Schema.safeParse({
      title: values.title,
      format: values.format,
      locationType: values.locationType,
      level: values.level,
      languages: values.languages,
      city: values.city,
      address: values.address,
      venue: values.venue,
      startDate: values.startDate,
      endDate: values.endDate,
      registrationDeadline: values.registrationDeadline,
      price: values.price,
    });
    const s2 = step2Schema.safeParse({
      description: values.description,
      coverImage: values.coverImage,
      logoImage: values.logoImage,
      sections: values.sections,
    });
    const s3 = step3Schema.safeParse({
      registrationType: values.registrationType,
      externalUrl: values.externalUrl,
      paymentMethod: values.paymentMethod,
      paymentAccount: values.paymentAccount,
      paymentRecipient: values.paymentRecipient,
      instagram: values.instagram,
      telegram: values.telegram,
      tiktok: values.tiktok,
      email: values.email,
    });

    // Схемы отдают КЛЮЧИ сообщений (см. lib/validations/*.ts) — переводим их
    // здесь, до показа: иначе в поле появится «titleRequired».
    const merged: FieldErrors = {
      ...(s1.success ? {} : translateFieldErrors(s1.error.flatten().fieldErrors)),
      ...(s2.success ? {} : translateFieldErrors(s2.error.flatten().fieldErrors)),
      ...(s3.success ? {} : translateFieldErrors(s3.error.flatten().fieldErrors)),
    };

    if (Object.keys(merged).length > 0) {
      setErrors(merged);
      errorBannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});

    const fd = new FormData();
    fd.set("title", values.title);
    fd.set("format", values.format);
    fd.set("locationType", values.locationType);
    fd.set("level", values.level);
    values.languages.forEach((lang) => fd.append("languages", lang));
    fd.set("city", values.city);
    fd.set("address", values.address);
    fd.set("venue", values.venue);
    fd.set("startDate", values.startDate);
    fd.set("endDate", values.endDate);
    fd.set("registrationDeadline", values.registrationDeadline);
    fd.set("price", values.price);
    fd.set("description", values.description);
    fd.set("coverImage", values.coverImage);
    fd.set("logoImage", values.logoImage);
    fd.set("sectionsJson", JSON.stringify(values.sections));
    fd.set("registrationType", values.registrationType);
    fd.set("externalUrl", values.externalUrl);
    fd.set("paymentMethod", values.paymentMethod);
    fd.set("paymentAccount", values.paymentAccount);
    fd.set("paymentRecipient", values.paymentRecipient);
    fd.set("instagram", values.instagram);
    fd.set("telegram", values.telegram);
    fd.set("tiktok", values.tiktok);
    fd.set("email", values.email);
    startTransition(() => formAction(fd));
  }

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {state?.message && !state.success && (
        <p ref={errorBannerRef} role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          ❌ {state.message}
        </p>
      )}
      {hasErrors && !state?.message && (
        <p ref={errorBannerRef} role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {t("hasErrors")}
        </p>
      )}

      <Section title={t("step1")}>
        <Step1BasicInfo values={values} errors={fieldErrors} update={update} />
      </Section>

      <Section title={t("step2")}>
        <Step2Content values={values} errors={fieldErrors} update={update} />
      </Section>

      <Section title={t("step3")}>
        <Step3Contacts values={values} errors={fieldErrors} update={update} />
      </Section>

      <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
        {pending ? t("saving") : <><Save size={18} /> {t("saveChanges")}</>}
      </Button>

      <DangerZone tournamentId={tournament.id} />
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <ClipboardCheck size={18} />
        </div>
        <h2 className="text-lg font-bold text-navy-900">{title}</h2>
      </div>
      <div className="mt-6">{children}</div>
    </Card>
  );
}

/**
 * Опасная зона — отмена (мягкое удаление) турнира. Инлайн-подтверждение
 * (никаких нативных confirm — паттерн UserRow); при успехе уводим на «Мои
 * турниры».
 */
function DangerZone({ tournamentId }: { tournamentId: string }) {
  const t = useTranslations("createTournament");
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function handleDelete() {
    setError(null);
    startDelete(async () => {
      const result = await deleteOwnTournament(tournamentId);
      if (!result.ok) {
        setError(result.error);
        setConfirm(false);
        return;
      }
      router.push("/profile?tab=tournaments");
      router.refresh();
    });
  }

  return (
    <Card className="border-rose-200 bg-rose-50/40 p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-navy-900">{t("cancelTitle")}</h2>
          <p className="mt-1 text-sm text-muted">
            {t("cancelText")}
          </p>

          {error && (
            <p role="alert" className="mt-3 text-sm text-rose-600">
              {error}
            </p>
          )}

          {confirm ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-rose-300 text-rose-600 hover:border-rose-400 hover:text-rose-700"
                onClick={handleDelete}
                disabled={pending}
              >
                {pending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {t("cancelYes")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setConfirm(false);
                  triggerRef.current?.focus();
                }}
                disabled={pending}
              >
                {t("cancelNo")}
              </Button>
            </div>
          ) : (
            <Button
              ref={triggerRef}
              type="button"
              variant="outline"
              className="mt-4 border-rose-300 text-rose-600 hover:border-rose-400 hover:text-rose-700"
              onClick={() => setConfirm(true)}
            >
              <Trash2 size={16} /> {t("cancelButton")}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
