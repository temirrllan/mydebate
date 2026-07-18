"use client";

import { useActionState, useState, startTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Save, Info, Calendar, MapPin, Wallet, Globe2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldError } from "@/components/auth/field-error";
import { ImageUploadField } from "@/components/tournaments/create/image-upload-field";
import { SectionsEditor } from "@/components/tournaments/create/sections-editor";
import type { WizardSection } from "@/components/tournaments/create/types";
import { editTournament } from "@/lib/actions/tournaments";
// ВАЖНО: EDIT_TOURNAMENT_SUCCESS_MESSAGE (константа) намеренно НЕ импортируется
// сюда — та же причина, что и у REGISTRATION_SUCCESS_MESSAGE/
// SUPPORT_TICKET_SUCCESS_MESSAGE (см. register-form.tsx/contact-form.tsx):
// "use server" файлы в этой версии Next/Turbopack обязаны экспортировать
// только async-функции, если модуль попадает в клиентский бандл.
import { step2Schema } from "@/lib/validations/tournament";
import { TournamentStatus } from "@/lib/enums";
import { FORMAT_LABEL, LOCATION_TYPE_LABEL, formatDateRu, formatPrice } from "@/lib/format";
import type { TournamentEditData } from "@/lib/tournaments/queries";

const initialState = undefined;
const MIN_DESCRIPTION_LENGTH = 50;

/**
 * Форма редактирования турнира организатором (Этап 7, фича 2). Редактируются
 * только description/coverImage/logoImage/sections — дата, цена, формат и
 * место показаны read-only ниже (спек: меняются только через поддержку).
 * Как и SectionsEditor/ImageUploadField, поля контролируемые (не нативный
 * FormData со страницы) — на submit вручную собираем FormData и вызываем
 * `formAction` напрямую (тот же приём, что и на финальном шаге
 * create-wizard.tsx).
 */
export function EditTournamentForm({ tournament }: { tournament: TournamentEditData }) {
  const boundAction = editTournament.bind(null, tournament.id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const [description, setDescription] = useState(tournament.description);
  const [coverImage, setCoverImage] = useState(tournament.coverImage ?? "");
  const [logoImage, setLogoImage] = useState(tournament.logoImage ?? "");
  const [sections, setSections] = useState<WizardSection[]>(
    tournament.sections.map((s) => ({ title: s.title, description: s.description })),
  );
  const [clientErrors, setClientErrors] = useState<Record<string, string[]>>({});

  const fieldErrors = { ...clientErrors, ...(state?.fieldErrors ?? {}) };
  const canViewTournament = tournament.status === TournamentStatus.PUBLISHED;

  if (state?.success) {
    return (
      <Card role="status" className="p-8 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={30} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-navy-900">Готово!</h2>
        <p className="mt-2 text-muted">{state.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/profile?tab=tournaments">Мои турниры</Link>
          </Button>
          {canViewTournament && (
            <Button asChild size="lg" variant="outline">
              <Link href={`/tournaments/${tournament.id}`}>Смотреть турнир</Link>
            </Button>
          )}
        </div>
      </Card>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = step2Schema.safeParse({ description, coverImage, logoImage, sections });
    if (!result.success) {
      setClientErrors(result.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    setClientErrors({});

    const fd = new FormData();
    fd.set("description", description);
    fd.set("coverImage", coverImage);
    fd.set("logoImage", logoImage);
    fd.set("sectionsJson", JSON.stringify(sections));
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {state?.message && !state.success && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
          ❌ {state.message}
        </p>
      )}

      <Card className="flex gap-3 bg-brand-50/60 p-5">
        <Info size={18} className="mt-0.5 shrink-0 text-brand-600" />
        <p className="text-sm text-muted">
          Дату, стоимость и место проведения нельзя изменить здесь — они уже видны участникам. Чтобы
          изменить эти данные, напишите нам через{" "}
          <Link href="/contacts" className="font-medium text-brand-600 hover:text-brand-700">
            форму поддержки
          </Link>
          .
        </p>
      </Card>

      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-navy-900">Неизменяемые данные</h2>
          <Badge tone="blue">{FORMAT_LABEL[tournament.format] ?? tournament.format}</Badge>
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-2 text-sm">
            <Calendar size={16} className="mt-0.5 shrink-0 text-muted" />
            <div>
              <dt className="text-muted">Дата начала</dt>
              <dd className="font-medium text-ink">{formatDateRu(tournament.startDate)}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Calendar size={16} className="mt-0.5 shrink-0 text-muted" />
            <div>
              <dt className="text-muted">Дедлайн регистрации</dt>
              <dd className="font-medium text-ink">{formatDateRu(tournament.registrationDeadline)}</dd>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            {tournament.locationType === "OFFLINE" ? (
              <MapPin size={16} className="mt-0.5 shrink-0 text-muted" />
            ) : (
              <Globe2 size={16} className="mt-0.5 shrink-0 text-muted" />
            )}
            <div>
              <dt className="text-muted">Место проведения</dt>
              <dd className="font-medium text-ink">
                {tournament.city ?? LOCATION_TYPE_LABEL[tournament.locationType] ?? "Онлайн"}
              </dd>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <Wallet size={16} className="mt-0.5 shrink-0 text-muted" />
            <div>
              <dt className="text-muted">Стоимость участия</dt>
              <dd className="font-medium text-ink">{formatPrice(tournament.price)}</dd>
            </div>
          </div>
        </dl>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-navy-900">Описание и материалы</h2>

        <div className="mt-5">
          <label htmlFor="description" className="text-sm font-medium text-ink">
            Описание турнира <span className="text-rose-500">*</span>
          </label>
          <div className="relative mt-1.5">
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={7}
              placeholder="Расскажите об идее турнира, программе, целевой аудитории и других важных деталях…"
              className="w-full rounded-[var(--radius-btn)] border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              aria-invalid={Boolean(fieldErrors.description?.length)}
              aria-describedby={fieldErrors.description?.length ? "description-error" : undefined}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <FieldError id="description-error" messages={fieldErrors.description} />
            <span
              className={`ml-auto text-xs ${description.trim().length < MIN_DESCRIPTION_LENGTH ? "text-muted" : "text-emerald-600"}`}
            >
              {description.length}/{MIN_DESCRIPTION_LENGTH} минимум
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto]">
          <ImageUploadField
            label="Обложка турнира"
            shape="wide"
            value={coverImage}
            onChange={setCoverImage}
            hint="JPEG, PNG или WebP, до 5 МБ. Показывается в карточке и на странице турнира."
            errors={fieldErrors.coverImage}
          />
          <ImageUploadField
            label="Логотип"
            shape="square"
            value={logoImage}
            onChange={setLogoImage}
            errors={fieldErrors.logoImage}
          />
        </div>

        <div className="mt-6">
          <SectionsEditor sections={sections} onChange={setSections} errors={fieldErrors.sections} />
        </div>
      </Card>

      <Button type="submit" size="lg" className="w-full justify-center" disabled={pending}>
        {pending ? (
          "Сохраняем…"
        ) : (
          <>
            <Save size={18} /> Сохранить изменения
          </>
        )}
      </Button>
    </form>
  );
}
