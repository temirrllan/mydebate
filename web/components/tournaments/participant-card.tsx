import Image from "next/image";
import {
  Mail,
  Phone,
  GraduationCap,
  School,
  Users2,
  Languages,
  Landmark,
  Award,
  MessageSquare,
  Calendar,
  Receipt,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Level } from "@/lib/enums";
import { REG_STATUS_LABEL, REG_STATUS_TONE, LEVEL_LABEL, formatDateRu } from "@/lib/format";
import type { TournamentParticipant } from "@/lib/tournaments/queries";

/**
 * Карточка одного участника — страница организатора «Участники турнира»
 * (Этап 7, фича 3). Поля анкеты (fullName/gradeOrCourse/… — снимок формы
 * регистрации, lib/actions/registrations.ts) могут быть пустыми у старых
 * записей — каждая строка рендерится только если значение заполнено.
 */
export function ParticipantCard({
  participant,
  control,
}: {
  participant: TournamentParticipant;
  /**
   * Необязательный слот управления статусом (селектор организатора). Когда
   * передан — заменяет статичный бейдж статуса; на публичном/read-only
   * рендере не передаётся, и карточка выглядит как раньше.
   */
  control?: React.ReactNode;
}) {
  const displayName = participant.fullName || `${participant.user.firstName} ${participant.user.lastName}`;
  const initials = `${participant.user.firstName?.[0] ?? ""}${participant.user.lastName?.[0] ?? ""}`.toUpperCase();

  const rows: { icon: typeof Mail; label: string; value: string }[] = [];
  if (participant.contactEmail || participant.user.email) {
    rows.push({ icon: Mail, label: "Email", value: participant.contactEmail || participant.user.email });
  }
  if (participant.phone) rows.push({ icon: Phone, label: "Телефон", value: participant.phone });
  if (participant.gradeOrCourse) {
    rows.push({ icon: GraduationCap, label: "Класс / Курс", value: participant.gradeOrCourse });
  }
  if (participant.schoolOrUniversity) {
    rows.push({ icon: School, label: "Школа / Университет", value: participant.schoolOrUniversity });
  }
  if (participant.teamName) rows.push({ icon: Users2, label: "Команда", value: participant.teamName });
  if (participant.teammateNames) {
    rows.push({ icon: Users2, label: "Тиммейты", value: participant.teammateNames });
  }
  if (participant.experienceLevel) {
    rows.push({
      icon: Award,
      label: "Уровень опыта",
      value: LEVEL_LABEL[participant.experienceLevel as Level] ?? participant.experienceLevel,
    });
  }
  if (participant.preferredLanguage) {
    rows.push({ icon: Languages, label: "Язык", value: participant.preferredLanguage });
  }
  // Комитет вместо языка — заявка на MUN (см. register-form.tsx).
  if (participant.committee) {
    rows.push({ icon: Landmark, label: "Комитет", value: participant.committee });
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
            {participant.user.image ? (
              <Image src={participant.user.image} alt="" fill sizes="44px" className="object-cover" />
            ) : (
              initials || "?"
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{displayName}</p>
            <p className="inline-flex items-center gap-1 text-xs text-muted">
              <Calendar size={12} /> Подал(а) заявку {formatDateRu(participant.createdAt)}
            </p>
          </div>
        </div>
        {control ?? (
          <Badge tone={REG_STATUS_TONE[participant.status] ?? "gray"}>
            {REG_STATUS_LABEL[participant.status] ?? participant.status}
          </Badge>
        )}
      </div>

      {rows.length > 0 && (
        <dl className="mt-4 grid gap-2.5 border-t border-line pt-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start gap-2 text-sm">
              <row.icon size={15} className="mt-0.5 shrink-0 text-muted" />
              <div className="min-w-0">
                <dt className="text-xs text-muted">{row.label}</dt>
                <dd className="truncate font-medium text-ink">{row.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}

      {participant.additionalInfo && (
        <div className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-sm">
          <MessageSquare size={15} className="mt-0.5 shrink-0 text-muted" />
          <div>
            <p className="text-xs text-muted">Дополнительная информация</p>
            <p className="mt-0.5 text-ink">{participant.additionalInfo}</p>
          </div>
        </div>
      )}

      {/* Чек об оплате. Открывается в новой вкладке — файл отдаёт маршрут с
          проверкой прав (app/uploads/receipts/[filename]/route.ts), чужому по
          этой ссылке придёт 404. */}
      {participant.receiptUrl && (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4 text-sm">
          <span className="flex items-center gap-2 text-muted">
            <Receipt size={15} className="shrink-0" /> Чек об оплате
          </span>
          <a
            href={participant.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-600 underline-offset-2 hover:underline"
          >
            Посмотреть
          </a>
        </div>
      )}
    </Card>
  );
}
