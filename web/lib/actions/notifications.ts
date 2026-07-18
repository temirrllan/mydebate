"use server";

// Server Actions уведомлений (spec §9.4 "Notifications (list, mark read)").
// `list` реализован как запрос в lib/profile/queries.ts
// (getMyNotifications/getUnreadNotificationCount) — здесь только мутация
// "прочитано", ownership-проверка обязательна (нельзя пометить чужое
// уведомление прочитанным).

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export type NotificationActionResult = { ok: true } | { ok: false; error: string };

/** Помечает одно уведомление прочитанным — только если оно принадлежит текущему пользователю. */
export async function markNotificationRead(notificationId: string): Promise<NotificationActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Необходимо войти в систему." };

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true },
  });

  if (!notification || notification.userId !== user.id) {
    return { ok: false, error: "Уведомление не найдено." };
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  revalidatePath("/profile");
  return { ok: true };
}

/** Помечает все уведомления текущего пользователя прочитанными. */
export async function markAllNotificationsRead(): Promise<NotificationActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Необходимо войти в систему." };

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/profile");
  return { ok: true };
}
