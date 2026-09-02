"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Lock, Unlock, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setUserBlocked, deleteUser, setUserRole } from "@/lib/actions/admin";
import { Role } from "@/lib/enums";

const ROLE_OPTIONS = [Role.USER, Role.ORGANIZER, Role.ADMIN] as const;
import type { AdminUserListItem } from "@/lib/admin/queries";
import { useLocale, useTranslations } from "next-intl";
import { formatDateShort } from "@/lib/format";

const ROLE_TONE: Record<string, "gray" | "blue" | "navy"> = {
  [Role.USER]: "gray",
  [Role.ORGANIZER]: "blue",
  [Role.ADMIN]: "navy",
};


/**
 * Строка пользователя в таблице /admin/users. Локальная копия `user`
 * (оптимистичный паттерн, как FavoriteButton/NotificationsPanel) — блок/
 * разблок обновляет бейдж на месте, удаление скрывает строку. Кнопки
 * дизейблены для себя и для ADMIN — сервер (`lib/actions/admin.ts`) всё
 * равно отклонит такие запросы отдельно, но UI не должен провоцировать
 * пользователя на заведомо неудачное действие.
 */
export function UserRow({ user: initialUser, currentAdminId }: { user: AdminUserListItem; currentAdminId: string }) {
  const t = useTranslations("admin");
  const tEnum = useTranslations("enums");
  const locale = useLocale();
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
        setError(result.error ?? t("genericError"));
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
        setError(result.error ?? t("genericError"));
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
        setError(result.error ?? t("genericError"));
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
            <Badge tone={ROLE_TONE[user.role] ?? "gray"}>{tEnum(`role.${user.role}`)}</Badge>
            {user.isBlocked && <Badge tone="red">{t("blocked")}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
          <p className="mt-1 text-xs text-muted">
            {t("userStats", {
              organized: user.organizedCount,
              registrations: user.registrationsCount,
              date: formatDateShort(user.createdAt, locale),
            })}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className="sr-only sm:not-sr-only">{t("roleLabel")}</span>
            <select
              aria-label={t("roleOf", { name: `${user.firstName} ${user.lastName}` })}
              value={user.role}
              disabled={disabled || pending}
              title={
                isSelf
                  ? t("cannotChangeOwnRole")
                  : isAdmin
                    ? t("cannotChangeAdminRole")
                    : undefined
              }
              onChange={(e) => handleRoleChange(e.target.value)}
              className="rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {tEnum(`role.${r}`)}
                </option>
              ))}
            </select>
          </label>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || pending}
            title={disabled ? t("actionUnavailable") : undefined}
            onClick={handleToggleBlock}
          >
            {pending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : user.isBlocked ? (
              <Unlock size={14} />
            ) : (
              <Lock size={14} />
            )}
            {user.isBlocked ? t("unblock") : t("block")}
          </Button>

          {!confirmDelete ? (
            <Button
              ref={deleteTriggerRef}
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50"
              disabled={disabled || pending}
              title={disabled ? t("actionUnavailable") : undefined}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={14} /> {t("delete")}
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
                {pending ? <Loader2 size={14} className="animate-spin" /> : t("confirmDelete")}
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={cancelDelete}>
                {t("no")}
              </Button>
            </span>
          )}
        </div>
      </div>

      {disabled && (
        <p className="mt-2 text-xs text-muted">
          {isSelf
            ? t("ownAccountNote")
            : t("adminNote")}
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
