"use client";

import { useMemo, useState, useTransition } from "react";
import { Users, Download, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ParticipantCard } from "@/components/tournaments/participant-card";
import { AnnouncementPanel } from "@/components/tournaments/announcement-panel";
import { setRegistrationStatus } from "@/lib/actions/registrations";
import { REG_STATUS_ORDER, REG_STATUS_TONE } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TournamentParticipant } from "@/lib/tournaments/queries";
import { useTranslations } from "next-intl";

const ALL = "ALL";

/**
 * Управление заявками участников — клиентская обёртка над списком
 * (/tournaments/[id]/participants). Организатор может фильтровать по статусу,
 * менять статус каждой заявки (оптимистично, как UserRow), выгружать список
 * в CSV и разослать участникам сообщение (AnnouncementPanel). Контроль
 * доступа полностью на сервере (setRegistrationStatus + announceToParticipants
 * + export route) — здесь только UI.
 */
export function ParticipantsManager({
  tournamentId,
  tournamentTitle,
  participants: initial,
}: {
  tournamentId: string;
  tournamentTitle: string;
  participants: TournamentParticipant[];
}) {
  const t = useTranslations("participants");
  const tEnum = useTranslations("enums");
  const [participants, setParticipants] = useState(initial);
  const [filter, setFilter] = useState<string>(ALL);

  // Счётчики по статусам для чипов-фильтров (пересчитываются при смене статуса).
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of participants) map[p.status] = (map[p.status] ?? 0) + 1;
    return map;
  }, [participants]);

  const visible = filter === ALL ? participants : participants.filter((p) => p.status === filter);

  const chips = [
    { value: ALL, label: t("all"), count: participants.length },
    ...REG_STATUS_ORDER.filter((s) => (counts[s] ?? 0) > 0).map((s) => ({
      value: s,
      label: tEnum(`regStatus.${s}`),
      count: counts[s],
    })),
  ];

  const exportHref = `/tournaments/${tournamentId}/participants/export${
    filter === ALL ? "" : `?status=${filter}`
  }`;

  function updateStatus(id: string, status: string) {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  return (
    <div>
      {/* Рассылка живёт здесь, а не отдельным блоком на странице: ей нужны те
          же счётчики по статусам, что и фильтрам, а они пересчитываются при
          каждой смене статуса заявки. */}
      <div className="mb-6">
        <AnnouncementPanel
          tournamentId={tournamentId}
          tournamentTitle={tournamentTitle}
          counts={counts}
          total={participants.length}
        />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("filterLabel")}>
          {chips.map((chip) => {
            const active = filter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setFilter(chip.value)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-line bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700",
                )}
              >
                {chip.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs",
                    active ? "bg-white/20" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        <Button asChild variant="outline" size="sm" className="shrink-0 self-start sm:self-auto">
          <a href={exportHref} download>
            <Download size={16} /> {t("downloadCsv")}
          </a>
        </Button>
      </div>

      <div className="mt-8">
        {visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              filter === ALL
                ? t("emptyAll")
                : t("emptyFiltered")
            }
            description={
              filter === ALL
                ? t("emptyAllText")
                : t("emptyFilteredText")
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((p, index) => (
              <div
                key={p.id}
                className="animate-fade-in"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <ParticipantCard
                  participant={p}
                  control={<StatusControl participant={p} onChange={updateStatus} />}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Селектор статуса одной заявки. Оптимистично обновляет родителя, откатывает
 * при ошибке сервера (паттерн UserRow.handleRoleChange).
 */
function StatusControl({
  participant,
  onChange,
}: {
  participant: TournamentParticipant;
  onChange: (id: string, status: string) => void;
}) {
  const t = useTranslations("participants");
  const tEnum = useTranslations("enums");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(next: string) {
    if (next === participant.status) return;
    const prev = participant.status;
    setError(null);
    onChange(participant.id, next); // оптимистично
    startTransition(async () => {
      const result = await setRegistrationStatus(participant.id, next);
      if (!result.ok) {
        setError(result.error);
        onChange(participant.id, prev); // откат
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Badge tone={REG_STATUS_TONE[participant.status] ?? "gray"}>
          {tEnum(`regStatus.${participant.status}`)}
        </Badge>
        {pending && <Loader2 size={14} className="animate-spin text-muted" aria-hidden="true" />}
      </div>
      <Select
        wrapperClassName="w-[168px]"
        className="h-9 text-xs"
        value={participant.status}
        disabled={pending}
        aria-label={t("changeStatus", { name: participant.fullName ?? participant.user.firstName })}
        onChange={(e) => handleChange(e.target.value)}
      >
        {REG_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {tEnum(`regStatus.${s}`)}
          </option>
        ))}
      </Select>
      {error && (
        <p role="alert" className="text-right text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
