"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/actions/notifications";
import type { ProfileNotificationItem } from "@/lib/profile/queries";

/** «11 мая 2024, 14:32» — с временем, в отличие от formatDateRu (там только дата). */
function formatDateTimeRu(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function NotificationsPanel({ notifications }: { notifications: ProfileNotificationItem[] }) {
  const [items, setItems] = useState(notifications);
  const [pending, startTransition] = useTransition();

  const hasUnread = items.some((n) => !n.isRead);

  function markOne(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    startTransition(async () => {
      const result = await markNotificationRead(id);
      if (!result.ok) {
        // откат при ошибке
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
      }
    });
  }

  function markAll() {
    const prevItems = items;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    startTransition(async () => {
      const result = await markAllNotificationsRead();
      if (!result.ok) setItems(prevItems);
    });
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Пока нет уведомлений"
        description="Здесь появятся уведомления о статусе ваших заявок и новостях турниров."
      />
    );
  }

  return (
    <div>
      {hasUnread && (
        <div className="mb-4 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={markAll} disabled={pending}>
            <CheckCheck size={15} /> Прочитать все
          </Button>
        </div>
      )}

      <ul className="divide-y divide-line">
        {items.map((n) => (
          <li
            key={n.id}
            className={cn("flex items-start gap-3 py-4", !n.isRead && "bg-brand-50/40 -mx-4 px-4 rounded-lg")}
          >
            <span
              className={cn(
                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                n.isRead ? "bg-transparent" : "bg-brand-600",
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              {n.link ? (
                <Link href={n.link} className="font-medium text-ink hover:text-brand-700">
                  {n.title}
                </Link>
              ) : (
                <p className="font-medium text-ink">{n.title}</p>
              )}
              <p className="mt-0.5 text-sm text-muted">{n.message}</p>
              <p className="mt-1 text-xs text-muted">{formatDateTimeRu(n.createdAt)}</p>
            </div>
            {!n.isRead && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => markOne(n.id)}
                aria-label="Отметить прочитанным"
              >
                <Check size={15} />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
