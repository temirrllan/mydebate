"use client";

import { useState, useTransition } from "react";
import { Loader2, MessageSquare, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { respondToTicket, closeTicket } from "@/lib/actions/admin";
import { SUPPORT_TICKET_STATUS_TONE, formatDateTime } from "@/lib/format";
import { SupportTicketStatus } from "@/lib/enums";
import type { AdminSupportTicketItem } from "@/lib/admin/queries";
import { useLocale, useTranslations } from "next-intl";


/** Карточка обращения в поддержку (app/admin/support/page.tsx) — ответ + закрытие, локальное оптимистичное состояние. */
export function TicketCard({ ticket: initialTicket }: { ticket: AdminSupportTicketItem }) {
  const t = useTranslations("admin");
  const tEnum = useTranslations("enums");
  const locale = useLocale();
  const [ticket, setTicket] = useState(initialTicket);
  const [responding, setResponding] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleRespond() {
    const text = responseText.trim();
    if (!text) {
      setError(t("responseRequired"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await respondToTicket(ticket.id, text);
      if (!result.ok) {
        setError(result.error ?? result.fieldErrors?.response?.[0] ?? t("genericError"));
        return;
      }
      setTicket((prev) => ({ ...prev, status: SupportTicketStatus.ANSWERED, response: text }));
      setResponding(false);
      setResponseText("");
    });
  }

  function handleClose() {
    setError(null);
    startTransition(async () => {
      const result = await closeTicket(ticket.id);
      if (!result.ok) {
        setError(result.error ?? t("genericError"));
        setConfirmClose(false);
        return;
      }
      setTicket((prev) => ({ ...prev, status: SupportTicketStatus.CLOSED }));
      setConfirmClose(false);
    });
  }

  const isClosed = ticket.status === SupportTicketStatus.CLOSED;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-ink">{ticket.subject}</h3>
        <Badge tone={SUPPORT_TICKET_STATUS_TONE[ticket.status]}>
          {tEnum(`ticketStatus.${ticket.status}`)}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted">
        {ticket.user ? `${ticket.user.firstName} ${ticket.user.lastName}` : ticket.name ?? t("guest")} · {ticket.email}
      </p>
      <p className="mt-0.5 text-xs text-muted/80">{formatDateTime(ticket.createdAt, locale)}</p>

      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink">{ticket.message}</p>

      {ticket.response && (
        <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/60 p-4">
          <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">{t("adminResponse")}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{ticket.response}</p>
        </div>
      )}

      {!isClosed && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!responding && (
            <Button type="button" variant="outline" size="sm" onClick={() => setResponding(true)}>
              <MessageSquare size={14} /> {ticket.response ? t("editResponse") : t("reply")}
            </Button>
          )}

          {!confirmClose ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50"
              onClick={() => setConfirmClose(true)}
            >
              <X size={14} /> {t("closeTicket")}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="text-xs text-muted">{t("confirmClose")}</span>
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={handleClose}>
                {pending ? <Loader2 size={14} className="animate-spin" /> : t("yes")}
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setConfirmClose(false)}>
                {t("no")}
              </Button>
            </span>
          )}
        </div>
      )}

      {responding && (
        <div className="mt-3 rounded-lg border border-line bg-canvas p-4">
          <label htmlFor={`response-${ticket.id}`} className="text-sm font-medium text-ink">
            {t("responseText")} <span className="text-rose-500">*</span>
          </label>
          <textarea
            id={`response-${ticket.id}`}
            rows={4}
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder={t("responsePlaceholder")}
            className="mt-1.5 w-full rounded-[var(--radius-btn)] border border-line bg-white p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={handleRespond}>
              {pending && <Loader2 size={14} className="animate-spin" />} {t("sendResponse")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setResponding(false);
                setResponseText("");
                setError(null);
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-600">❌ {error}</p>}
    </Card>
  );
}
