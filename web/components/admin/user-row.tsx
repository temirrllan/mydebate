"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Lock, Unlock, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setUserBlocked, deleteUser, setUserRole } from "@/lib/actions/admin";
import { ROLE_LABEL } from "@/lib/format";
import { Role } from "@/lib/enums";

const ROLE_OPTIONS = [Role.USER, Role.ORGANIZER, Role.ADMIN] as const;
import type { AdminUserListItem } from "@/lib/admin/queries";

const ROLE_TONE: Record<string, "gray" | "blue" | "navy"> = {
  [Role.USER]: "gray",
  [Role.ORGANIZER]: "blue",
  [Role.ADMIN]: "navy",
};

function formatDateRuShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(d);
}

/**
 * Строка пользователя в таблице /admin/users. Локальная копия `user`
 * (оптимистичный паттерн, как FavoriteButton/NotificationsPanel) — блок/
 * разблок обновляет бейдж на месте, удаление скрывает строку. Кнопки
 * дизейблены для себя и для ADMIN — сервер (`lib/actions/admin.ts`) всё
 * равно отклонит такие запросы отдельно, но UI не должен провоцировать
 * пользователя на заведомо неудачное действие.
 */
export function UserRow({ user: initialUser, currentAdminId }: { user: AdminUserListItem; currentAdminId: string }) {
  const [user, setUser] = useState(initialUser);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [removed, setRemoved] = useState(false);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);

  function cancelDelete() {
    setConfirmDelete(false);
    deleteTriggerRef.current?.focus();
  }

  const isSelf = user.id === currentAdminId;
  const isAdmin = user.role === Role.ADMIN;
  const disabled = isSelf || isAdmin;

  if (removed) return null;

  function handleToggleBlock() {
    setError(null);
    const next = !user.isBlocked;
    startTransition(async () => {
      const result = await setUserBlocked(user.id, next);
      if (!result.ok) {
        setError(result.error ?? "Что-то пошло не так. Попробуйте позже.");
        return;
      }
      setUser((prev) => ({ ...prev, isBlocked: next }));
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (!result.ok) {
        setError(result.error ?? "Что-то пошло не так. Попробуйте позже.");
        setConfirmDelete(false);
        return;
      }
      setRemoved(true);
    });
  }

  function handleRoleChange(nextRole: string) {
    if (nextRole === user.role) return;
    setError(null);
    const prevRole = user.role;
    // Оптимистично обновляем бейдж; откатываем при ошибке сервера.
    setUser((prev) => ({ ...prev, role: nextRole }));
    startTransition(async () => {
      const result = await setUserRole(user.id, nextRole);
      if (!result.ok) {
        setError(result.error ?? "Что-то пошло не так. Попробуйте позже.");
        setUser((prev) => ({ ...prev, role: prevRole }));
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">
              {user.firstName} {user.lastName}
            </p>
            <Badge tone={ROLE_TONE[user.role] ?? "gray"}>{ROLE_LABEL[user.role] ?? user.role}</Badge>
            {user.isBlocked && <Badge tone="red">Заблокирован</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
          <p className="mt-1 text-xs text-muted">
            Организовано турниров: {user.organizedCount} · Заявок на участие: {user.registrationsCount} · На
            платформе с {formatDateRuShort(user.createdAt)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="sr-only sm:not-sr-only">Роль:</span>
            <select
              aria-label={`Роль пользователя ${user.firstName} ${user.lastName}`}
              value={user.role}
              disabled={disabled || pending}
              title={
                isSelf
                  ? "Нельзя изменить собственную роль"
                  : isAdmin
                    ? "Нельзя изменить роль администратора"
                    : undefined
              }
              onChange={(e) => handleRoleChange(e.target.value)}
              className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r] ?? r}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || pending}
            title={disabled ? "Действие недоступно для администратора или для вашего аккаунта" : undefined}
            onClick={handleToggleBlock}
          >
            {pending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : user.isBlocked ? (
              <Unlock size={14} />
            ) : (
              <Lock size={14} />
            )}
            {user.isBlocked ? "Разблокировать" : "Заблокировать"}
          </Button>

          {!confirmDelete ? (
            <Button
              ref={deleteTriggerRef}
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50"
              disabled={disabled || pending}
              title={disabled ? "Действие недоступно для администратора или для вашего аккаунта" : undefined}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} /> Удалить
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                autoFocus
                className="border-rose-300 text-rose-600 hover:border-rose-400"
                disabled={pending}
                onClick={handleDelete}
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : "Точно удалить?"}
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={cancelDelete}>
                Нет
              </Button>
            </span>
          )}
        </div>
      </div>

      {disabled && (
        <p className="mt-2 text-xs text-muted">
          {isSelf
            ? "Это ваш аккаунт — смена роли, блокировка и удаление недоступны."
            : "Администраторов нельзя заблокировать, удалить или сменить им роль."}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-rose-600">
          ❌ {error}
        </p>
      )}
    </Card>
  );
}
