"use server";

// Server Action формы обращения в поддержку (Этап 7, spec §7 "Support
// tickets" + §9.4 "Support tickets"). До этого этапа SupportTicket создавался
// только в prisma/seed.ts — раздел админа «Обращения» был в проде всегда
// пуст, эта форма — единственное место, которое реально создаёт строки.
//
// По ТЗ обращается авторизованный пользователь, но модель допускает и гостя
// (userId nullable) — если сессии нет, userId = null, email/name берём из
// формы как есть. Для авторизованного клиент МОЖЕТ преднаполнить поля
// email/name его профилем, но сервер всё равно валидирует присланные
// значения, а не тянет их из сессии напрямую (пользователь мог осознанно
// указать другой контактный email).

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { NotificationType, Role } from "@/lib/enums";
import { SUPPORT_TICKET_SUCCESS_MESSAGE } from "@/lib/format";
import { createSupportTicketSchema } from "@/lib/validations/support";
import { createNotification } from "@/lib/notifications/create";
import { translateFieldErrors } from "@/lib/i18n/validation";

export type CreateSupportTicketActionState =
  | {
      message?: string;
      fieldErrors?: Record<string, string[]>;
      success?: boolean;
    }
  | undefined;

const GENERIC_ERROR = "Что-то пошло не так. Попробуйте позже.";

/**
 * Отправка формы «Обращение в поддержку». Рассчитана на `useActionState`.
 * Контракт полей FormData: name (опционально), email, subject, message —
 * все обычные текстовые поля по имени, без вложенных структур.
 */
export async function createSupportTicket(
  _prevState: CreateSupportTicketActionState,
  formData: FormData,
): Promise<CreateSupportTicketActionState> {
  const user = await getCurrentUser();

  const raw = {
    name: formData.get("name") ?? "",
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  };

  const parsed = createSupportTicketSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: await translateFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const data = parsed.data;

  try {
    await prisma.supportTicket.create({
      data: {
        userId: user?.id ?? null,
        name: data.name || (user ? `${user.firstName} ${user.lastName}` : null),
        email: data.email,
        subject: data.subject,
        message: data.message,
      },
    });
  } catch (error) {
    console.error("[support] Не удалось создать обращение:", error);
    return { message: GENERIC_ERROR };
  }

  // Критическое действие — логируем (spec §11).
  console.log(
    `[support] ${user ? `user=${user.id}` : "гость"} создал обращение в поддержку (email=${data.email}).`,
  );

  // Уведомление всех админов — новое обращение ждёт обработки (по образцу
  // NEW_TOURNAMENT_PENDING в lib/actions/tournaments.ts).
  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.id,
        type: NotificationType.NEW_SUPPORT_TICKET,
        title: "Новое обращение в поддержку",
        message: `Поступило новое обращение: «${data.subject}».`,
        link: "/admin/support?status=OPEN",
      }),
    ),
  );

  revalidatePath("/admin/support");

  return { success: true, message: SUPPORT_TICKET_SUCCESS_MESSAGE };
}
