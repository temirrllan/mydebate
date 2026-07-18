"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Send, CheckCircle2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar, type ProgressStep } from "@/components/ui/progress-bar";
import { createTournament } from "@/lib/actions/tournaments";
import { step1Schema, step2Schema, step3Schema } from "@/lib/validations/tournament";
import { Step1BasicInfo } from "./create/step1-basic-info";
import { Step2Content } from "./create/step2-content";
import { Step3Contacts } from "./create/step3-contacts";
import { INITIAL_WIZARD_VALUES, getStepForField, type FieldErrors, type WizardValues } from "./create/types";

const STEPS: ProgressStep[] = [
  { label: "Основная информация", description: "Формат, дата, место" },
  { label: "Описание и разделы", description: "Обложка, программа" },
  { label: "Контакты и регистрация", description: "Как подать заявку" },
];

const initialActionState = undefined;

/**
 * Мастер создания турнира (3 шага, spec §7). Состояние всех полей живёт в
 * одном объекте `values` на этом компоненте — переключение шагов не
 * размонтирует данные, а условно рендерит нужный под-шаг. Клиентская
 * валидация (step1Schema/step2Schema/step3Schema) гейтит переход "Далее" и
 * финальную отправку; сервер (`createTournament`) — источник истины,
 * возвращённые fieldErrors перебрасывают мастер на первый затронутый шаг.
 */
export function CreateTournamentWizard({ isAdmin = false }: { isAdmin?: boolean }) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<WizardValues>(INITIAL_WIZARD_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, formAction, pending] = useActionState(createTournament, initialActionState);
  const topRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  function update<K extends keyof WizardValues>(key: K, value: WizardValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // Синхронизация с результатом серверного экшена — сравнение ссылки на
  // `state` во время рендера (не в useEffect), как принято в проекте для
  // производного состояния (см. filters-bar.tsx / mydebate-frontend.md).
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.fieldErrors) {
      setErrors(state.fieldErrors);
      const firstField = Object.keys(state.fieldErrors)[0];
      if (firstField) setStep(getStepForField(firstField));
    }
  }

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    stepHeadingRef.current?.focus();
  }, [step]);

  if (state?.success) {
    return (
      <Card role="status" className="p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={30} />
        </div>
        {/* Админ публикует турнир сразу, минуя очередь модерации (см. createTournament),
            поэтому и заголовок, и пояснение под ним другие — иначе экран противоречит сам себе. */}
        <h2 className="mt-5 text-xl font-bold text-navy-900">
          {isAdmin ? "Турнир опубликован!" : "Турнир отправлен на модерацию!"}
        </h2>
        <p className="mt-2 text-muted">{state.message}</p>
        <p className="mt-1 text-sm text-muted">
          {isAdmin
            ? "Турнир уже виден в публичном каталоге."
            : "После проверки администратором турнир появится в публичном каталоге, а вам придёт уведомление."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/profile?tab=tournaments">Мои турниры</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/tournaments">К каталогу турниров</Link>
          </Button>
        </div>
      </Card>
    );
  }

  function step1Payload() {
    return {
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
    };
  }

  function step2Payload() {
    return {
      description: values.description,
      coverImage: values.coverImage,
      logoImage: values.logoImage,
      sections: values.sections,
    };
  }

  function step3Payload() {
    return {
      registrationType: values.registrationType,
      externalUrl: values.externalUrl,
      instagram: values.instagram,
      telegram: values.telegram,
      email: values.email,
    };
  }

  function buildFormData(): FormData {
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
    fd.set("instagram", values.instagram);
    fd.set("telegram", values.telegram);
    fd.set("email", values.email);
    return fd;
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (step === 1) {
      const result = step1Schema.safeParse(step1Payload());
      if (!result.success) {
        setErrors(result.error.flatten().fieldErrors as FieldErrors);
        return;
      }
      setErrors({});
      setStep(2);
      return;
    }

    if (step === 2) {
      const result = step2Schema.safeParse(step2Payload());
      if (!result.success) {
        setErrors(result.error.flatten().fieldErrors as FieldErrors);
        return;
      }
      setErrors({});
      setStep(3);
      return;
    }

    // Шаг 3 — финальная отправка.
    const result = step3Schema.safeParse(step3Payload());
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors as FieldErrors);
      return;
    }
    setErrors({});
    startTransition(() => formAction(buildFormData()));
  }

  return (
    <div ref={topRef} className="space-y-8">
      <Card className="p-5 sm:p-6">
        <ProgressBar steps={STEPS} currentStep={step} />
      </Card>

      {isAdmin && (
        <div className="flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3.5 text-sm text-brand-800">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
          <p>
            Вы создаёте турнир как администратор — он будет опубликован сразу, без модерации.
          </p>
        </div>
      )}

      {state?.message && !state.success && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          ❌ {state.message}
        </p>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        Шаг {step} из {STEPS.length}: {STEPS[step - 1].label}
      </p>

      <form onSubmit={handleFormSubmit} noValidate>
        <Card className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <ClipboardCheck size={18} />
            </div>
            <h2 ref={stepHeadingRef} tabIndex={-1} className="text-lg font-bold text-navy-900 focus:outline-none">
              {step}. {STEPS[step - 1].label}
            </h2>
          </div>

          <div className="mt-6">
            {step === 1 && <Step1BasicInfo values={values} errors={errors} update={update} />}
            {step === 2 && <Step2Content values={values} errors={errors} update={update} />}
            {step === 3 && <Step3Contacts values={values} errors={errors} update={update} />}
          </div>
        </Card>

        <div className="mt-6 flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={pending}>
              <ChevronLeft size={18} /> Назад
            </Button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <Button type="submit">
              Далее <ChevronRight size={18} />
            </Button>
          ) : (
            <Button type="submit" disabled={pending}>
              {pending ? (
                "Отправляем…"
              ) : (
                <>
                  <Send size={18} /> {isAdmin ? "Создать и опубликовать" : "Отправить на модерацию"}
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
