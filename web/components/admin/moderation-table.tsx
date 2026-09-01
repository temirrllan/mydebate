"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Calendar, MapPin, Users, Check, X, EyeOff, Trash2, ExternalLink, Loader2, SearchX, SquarePen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FORMAT_LABEL,
  LOCATION_TYPE_LABEL,
  TOURNAMENT_STATUS_LABEL,
  formatDateRu,
  getTournamentStatusDisplay,
} from "@/lib/format";
import { TournamentStatus } from "@/lib/enums";
import { approveTournament, rejectTournament, hideTournament, deleteTournament } from "@/lib/actions/admin";
import type { AdminTournamentListItem } from "@/lib/admin/queries";

type RowAction = "approve" | "reject" | "hide" | "delete";

function pluralizeApplication(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "заявка";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "заявки";
  return "заявок";
}

/**
 * Список турниров очереди модерации / общего управления
 * (app/admin/moderation/page.tsx). Держит локальную копию `items` (тот же
 * оптимистичный паттерн, что и NotificationsPanel/CancelRegistrationButton) —
 * родитель монтирует с `key={статус+поиск+страница}`, чтобы при смене
 * URL-фильтров компонент переинициализировался свежими серверными данными,
 * а не пытался слить их со старым локальным состоянием.
 */
export function ModerationTable({
  items: initialItems,
  activeStatus,
}: {
  items: AdminTournamentListItem[];
  /** Текущий фильтр статуса ("" = «Все статусы») — после действия строка
   * убирается из списка, если новый статус турнира больше не проходит фильтр. */
  activeStatus: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [pendingRow, setPendingRow] = useState<{ id: string; action: RowAction } | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [expandedReject, setExpandedReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const deleteTriggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function cancelDelete(id: string) {
    setConfirmDeleteId(null);
    deleteTriggerRefs.current[id]?.focus();
  }

  function clearRowError(id: string) {
    setRowError((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function applyStatusUpdate(id: string, status: string, rejectionReason: string | null) {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, status, rejectionReason } : item));
      if (activeStatus && activeStatus !== status) {
        return next.filter((item) => item.id !== id);
      }
      return next;
    });
  }

  function runSimpleAction(
    id: string,
    action: Exclude<RowAction, "reject">,
    call: () => Promise<{ ok: boolean; error?: string }>,
    nextStatus: string,
  ) {
    clearRowError(id);
    setPendingRow({ id, action });
    startTransition(async () => {
      const result = await call();
      setPendingRow(null);
      if (!result.ok) {
        setRowError((prev) => ({ ...prev, [id]: result.error ?? "Что-то пошло не так. Попробуйте позже." }));
        return;
      }
      applyStatusUpdate(id, nextStatus, nextStatus === TournamentStatus.HIDDEN ? null : null);
      setConfirmDeleteId(null);
    });
  }

  function handleReject(id: string) {
    const reason = rejectReason.trim();
    if (!reason) {
      setRowError((prev) => ({ ...prev, [id]: "Укажите причину отклонения" }));
      return;
    }
    clearRowError(id);
    setPendingRow({ id, action: "reject" });
    startTransition(async () => {
      const result = await rejectTournament(id, reason);
      setPendingRow(null);
      if (!result.ok) {
        const message = result.error ?? result.fieldErrors?.reason?.[0] ?? "Что-то пошло не так. Попробуйте позже.";
        setRowError((prev) => ({ ...prev, [id]: message }));
        return;
      }
      applyStatusUpdate(id, TournamentStatus.REJECTED, reason);
      setExpandedReject(null);
      setRejectReason("");
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="Ничего не найдено"
        description="Нет турниров, соответствующих выбранным фильтрам."
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((t, i) => {
        const statusDisplay = getTournamentStatusDisplay(t.status, t.rejectionReason);
        const busy = pendingRow?.id === t.id;
        const isDeleted = t.status === TournamentStatus.DELETED;

        return (
          <Card
            key={t.id}
            className="animate-fade-in p-5"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {t.status === TournamentStatus.PUBLISHED ? (
                    <Link
                      href={`/tournaments/${t.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 font-semibold text-ink hover:text-brand-700"
                    >
                      {t.title} <ExternalLink size={13} className="text-muted" />
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink">{t.title}</span>
                  )}
                  <Badge tone={statusDisplay.tone}>{TOURNAMENT_STATUS_LABEL[statusDisplay.key] ?? statusDisplay.key}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  Организатор: {t.organizer.firstName} {t.organizer.lastName} · {t.organizer.email}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={14} /> {formatDateRu(t.startDate)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} /> {t.city ?? LOCATION_TYPE_LABEL[t.locationType] ?? "Онлайн"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users size={14} /> {t.registrationsCount} {pluralizeApplication(t.registrationsCount)}
                  </span>
                  <Badge tone="gray" className="text-[11px]">
                    {FORMAT_LABEL[t.format] ?? t.format}
                  </Badge>
                </div>
                {t.rejectionReason && (
                  <p className="mt-2 text-xs text-rose-600">Причина отклонения: {t.rejectionReason}</p>
                )}
              </div>

              {!isDeleted && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {t.status !== TournamentStatus.PUBLISHED && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        runSimpleAction(t.id, "approve", () => approveTournament(t.id), TournamentStatus.PUBLISHED)
                      }
                    >
                      {busy && pendingRow?.action === "approve" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Одобрить
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      clearRowError(t.id);
                      setExpandedReject((cur) => (cur === t.id ? null : t.id));
                    }}
                  >
                    <X size={14} /> Отклонить
                  </Button>

                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/tournaments/${t.id}/edit`}>
                      <SquarePen size={14} /> Редактировать
                    </Link>
                  </Button>

                  {t.status === TournamentStatus.PUBLISHED && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        runSimpleAction(t.id, "hide", () => hideTournament(t.id), TournamentStatus.HIDDEN)
                      }
                    >
                      {busy && pendingRow?.action === "hide" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <EyeOff size={14} />
                      )}
                      Скрыть
                    </Button>
                  )}

                  {confirmDeleteId === t.id ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        autoFocus
                        className="border-rose-300 text-rose-600 hover:border-rose-400"
                        disabled={busy}
                        onClick={() =>
                          runSimpleAction(t.id, "delete", () => deleteTournament(t.id), TournamentStatus.DELETED)
                        }
                      >
                        {busy && pendingRow?.action === "delete" ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          "Точно удалить?"
                        )}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => cancelDelete(t.id)}>
                        Нет
                      </Button>
                    </span>
                  ) : (
                    <Button
                      ref={(el) => {
                        deleteTriggerRefs.current[t.id] = el;
                      }}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50"
                      disabled={busy}
                      onClick={() => setConfirmDeleteId(t.id)}
                    >
                      <Trash2 size={14} /> Удалить
                    </Button>
                  )}
                </div>
              )}
            </div>

            {expandedReject === t.id && (
              <div className="mt-4 rounded-lg border border-line bg-canvas p-4">
                <label htmlFor={`reject-reason-${t.id}`} className="text-sm font-medium text-ink">
                  Причина отклонения <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id={`reject-reason-${t.id}`}
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Опишите, что нужно исправить организатору…"
                  className="mt-1.5 w-full rounded-[var(--radius-btn)] border border-line bg-white p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  aria-describedby={rowError[t.id] ? `row-error-${t.id}` : undefined}
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button type="button" size="sm" disabled={busy} onClick={() => handleReject(t.id)}>
                    {busy && pendingRow?.action === "reject" && <Loader2 size={14} className="animate-spin" />}
                    Отклонить турнир
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setExpandedReject(null);
                      setRejectReason("");
                      clearRowError(t.id);
                    }}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            )}

            {rowError[t.id] && (
              <p id={`row-error-${t.id}`} role="alert" className="mt-2 text-xs text-rose-600">
                ❌ {rowError[t.id]}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
