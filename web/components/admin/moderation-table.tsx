"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Calendar, MapPin, Users, Check, X, EyeOff, Trash2, ExternalLink, Loader2, SearchX, SquarePen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, getTournamentStatusDisplay } from "@/lib/format";
import { TournamentStatus } from "@/lib/enums";
import { approveTournament, rejectTournament, hideTournament, deleteTournament } from "@/lib/actions/admin";
import type { AdminTournamentListItem } from "@/lib/admin/queries";
import { useLocale, useTranslations } from "next-intl";

type RowAction = "approve" | "reject" | "hide" | "delete";


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
  // Переводчик назван tr, а не t: внутри map переменная турнира тоже `t`,
  // и одноимённый хук был бы ею затенён.
  const tr = useTranslations("admin");
  const tEnum = useTranslations("enums");
  const locale = useLocale();
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
        setRowError((prev) => ({ ...prev, [id]: result.error ?? tr("genericError") }));
        return;
      }
      applyStatusUpdate(id, nextStatus, nextStatus === TournamentStatus.HIDDEN ? null : null);
      setConfirmDeleteId(null);
    });
  }

  function handleReject(id: string) {
    const reason = rejectReason.trim();
    if (!reason) {
      setRowError((prev) => ({ ...prev, [id]: tr("rejectionRequired") }));
      return;
    }
    clearRowError(id);
    setPendingRow({ id, action: "reject" });
    startTransition(async () => {
      const result = await rejectTournament(id, reason);
      setPendingRow(null);
      if (!result.ok) {
        const message = result.error ?? result.fieldErrors?.reason?.[0] ?? tr("genericError");
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
        title={tr("nothingFound")}
        description={tr("noTournaments")}
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
                  <Badge tone={statusDisplay.tone}>{tEnum(`tournamentStatus.${statusDisplay.key}`)}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {tr("organizerLine", {
                    name: `${t.organizer.firstName} ${t.organizer.lastName}`,
                    email: t.organizer.email,
                  })}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={14} /> {formatDate(t.startDate, locale)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={14} /> {t.city ?? tEnum(`locationType.${t.locationType}`)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users size={14} /> {tr("applicationsCount", { count: t.registrationsCount })}
                  </span>
                  <Badge tone="gray" className="text-[11px]">
                    {tEnum(`format.${t.format}`)}
                  </Badge>
                </div>
                {t.rejectionReason && (
                  <p className="mt-2 text-xs text-rose-600">{tr("rejectionReasonLine", { reason: t.rejectionReason })}</p>
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
                      {tr("approve")}
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
                    <X size={14} /> {tr("reject")}
                  </Button>

                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/tournaments/${t.id}/edit`}>
                      <SquarePen size={14} /> {tr("edit")}
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
                      {tr("hide")}
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
                          tr("confirmDelete")
                        )}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => cancelDelete(t.id)}>
                        {tr("no")}
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
                      <Trash2 size={14} /> {tr("delete")}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {expandedReject === t.id && (
              <div className="mt-4 rounded-lg border border-line bg-canvas p-4">
                <label htmlFor={`reject-reason-${t.id}`} className="text-sm font-medium text-ink">
                  {tr("rejectionReason")} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id={`reject-reason-${t.id}`}
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={tr("rejectionPlaceholder")}
                  className="mt-1.5 w-full rounded-[var(--radius-btn)] border border-line bg-white p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
                  aria-describedby={rowError[t.id] ? `row-error-${t.id}` : undefined}
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button type="button" size="sm" disabled={busy} onClick={() => handleReject(t.id)}>
                    {busy && pendingRow?.action === "reject" && <Loader2 size={14} className="animate-spin" />}
                    {tr("rejectTournament")}
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
                    {tr("cancel")}
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
