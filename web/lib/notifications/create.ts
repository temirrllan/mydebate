// Внутренний хелпер создания уведомлений (spec §7 "Notifications"). Пишет
// in-app уведомление в таблицу Notification (читается профилем/колокольчиком)
// и — по умолчанию — дублирует его письмом на email пользователя. Держите
// здесь единую точку, не дублируйте по местам вызова (регистрация, модерация,
// заявки и т.д.).
import "server-only";

import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/lib/enums";
import { sendNotificationEmail } from "@/lib/email/templates";

export async function createNotification(input: {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  /**
   * Дублировать уведомление письмом. По умолчанию true. Ставьте false для
   * шумных/малополезных по почте событий, если такие появятся. In-app
   * уведомление создаётся всегда, независимо от этого флага.
   */
  email?: boolean;
}): Promise<void> {
  // In-app уведомление — надёжный канал, создаём и ждём всегда.
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type ?? null,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    },
  });

  if (input.email === false) return;

  // Email — best-effort: берём адрес пользователя и шлём письмо. Ошибки
  // отправки не должны ронять экшен (sendEmail и так их глотает), поэтому не
  // блокируем на них основной поток и не пробрасываем исключения наружу.
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true },
    });
    if (user?.email) {
      await sendNotificationEmail(user.email, {
        title: input.title,
        message: input.message,
        link: input.link ?? null,
      });
    }
  } catch (error) {
    console.error("[notifications] Не удалось отправить email-уведомление:", error);
  }
}
