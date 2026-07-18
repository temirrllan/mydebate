// Внутренний хелпер создания in-app уведомлений (spec §7 "Notifications").
// Никакого email/push — только запись в таблицу Notification, читается
// профилем пользователя (lib/profile/queries.ts) и, в будущем, колокольчиком
// в шапке. Держите здесь, не дублируйте `prisma.notification.create` по
// местам вызова (регистрация, избранное, модерация и т.д.).
import "server-only";

import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/lib/enums";

export async function createNotification(input: {
  userId: string;
  type?: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type ?? null,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    },
  });
}
