"use server";

// Рассылка участникам турнира — организатор пишет одно сообщение, оно уходит
// всем зарегистрированным сразу: ссылка на WhatsApp-группу, объявление о
// смене площадки, напоминание об оплате.
//
// Каналы те же, что и у остальных событий платформы: in-app уведомление
// (колокольчик/вкладка «Уведомления» в профиле) + письмо на email. Письмо —
// отдельным шаблоном (sendAnnouncementEmail): в нём сохраняются переносы
// строк и ссылка на группу остаётся кликабельной.
//
// Контроль доступа: рассылать может ТОЛЬКО владелец турнира или ADMIN.
// Проверяем на сервере и не различаем «чужой турнир»/«нет такого» — как в
// listTournamentParticipants.

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { Role, NotificationType } from "@/lib/enums";
import { rateLimit } from "@/lib/rate-limit";
import { sendAnnouncementEmail } from "@/lib/email/templates";
import {
  announcementSchema,
  ANNOUNCEMENT_AUDIENCE_ALL,
} from "@/lib/validations/announcement";

export type AnnouncementActionState =
  | {
      message?: string;
      fieldErrors?: Record<string, string[]>;
      success?: boolean;
      /** Скольким участникам ушло сообщение — показываем в подтверждении. */
      recipients?: number;
    }
  | undefined;

const GENERIC_ERROR = "Что-то пошло не так. Попробуйте позже.";

// Рассылка — действие с внешним эффектом (письма реальным людям), поэтому
// частоту ограничиваем: 5 рассылок в час на организатора. Защищает и
// участников от спама, и наш SMTP-аккаунт от блокировки за всплеск отправок.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

/**
 * Отправка сообщения всем участникам турнира. Рассчитана на `useActionState`,
 * привязывается к турниру через `.bind(null, tournamentId)` (как остальные
 * экшены проекта).
 */
export async function announceToParticipants(
  tournamentId: string,
  _prevState: AnnouncementActionState,
  formData: FormData,
): Promise<AnnouncementActionState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Необходимо войти в систему." };

  const parsed = announcementSchema.safeParse({
    subject: formData.get("subject"),
    message: formData.get("message"),
    audience: formData.get("audience") ?? ANNOUNCEMENT_AUDIENCE_ALL,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      title: true,
      organizerId: true,
      organizer: { select: { firstName: true, lastName: true } },
    },
  });

  const isOwner = tournament?.organizerId === user.id;
  const isAdmin = user.role === Role.ADMIN;
  if (!tournament || (!isOwner && !isAdmin)) {
    return { message: "Турнир не найден." };
  }

  const limit = rateLimit(`announce:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    const minutes = Math.ceil(limit.retryAfterSec / 60);
    return {
      message: `Слишком много рассылок подряд. Попробуйте через ${minutes} мин.`,
    };
  }

  const { subject, message, audience } = parsed.data;

  const recipients = await prisma.registration.findMany({
    where: {
      tournamentId,
      ...(audience === ANNOUNCEMENT_AUDIENCE_ALL ? {} : { status: audience }),
    },
    select: {
      // contactEmail — адрес из анкеты, который участник указал именно для
      // этого турнира; он может отличаться от почты аккаунта. Пишем на него,
      // а на почту аккаунта откатываемся, если анкета старая и поле пустое.
      contactEmail: true,
      user: { select: { id: true, email: true } },
    },
  });

  if (recipients.length === 0) {
    return { message: "В выбранной группе пока нет участников." };
  }

  const link = `/tournaments/${tournament.id}`;

  // In-app уведомления — одним запросом. Это надёжный канал (участник увидит
  // сообщение в профиле, даже если письмо не дойдёт), поэтому его пишем
  // синхронно и по его результату считаем рассылку состоявшейся.
  try {
    await prisma.notification.createMany({
      data: recipients.map((r) => ({
        userId: r.user.id,
        type: NotificationType.TOURNAMENT_ANNOUNCEMENT,
        title: subject,
        message,
        link,
      })),
    });
  } catch (error) {
    console.error("[announcements] Не удалось создать уведомления:", error);
    return { message: GENERIC_ERROR };
  }

  console.log(
    `[announcements] user=${user.id} разослал сообщение по tournament=${tournamentId}, получателей=${recipients.length}, аудитория=${audience}`,
  );

  const organizerName = `${tournament.organizer.firstName} ${tournament.organizer.lastName}`.trim();
  const addresses = recipients.map((r) => r.contactEmail || r.user.email).filter(Boolean) as string[];

  // Письма — после ответа (`after`), чтобы организатор не ждал у крутящегося
  // индикатора, пока SMTP переварит сотню адресов. Отправка best-effort:
  // sendEmail сам глотает ошибки, а in-app уведомления уже созданы.
  after(async () => {
    await sendAnnouncementEmails(addresses, {
      tournamentTitle: tournament.title,
      organizerName,
      subject,
      message,
      link,
    });
  });

  revalidatePath("/profile");

  return {
    success: true,
    recipients: recipients.length,
  };
}

/**
 * Рассылка писем небольшими пачками. Последовательная отправка сотни писем
 * заняла бы минуты, а параллельная — открыла бы сотню SMTP-соединений разом,
 * на что почтовый провайдер отвечает временной блокировкой отправителя.
 */
const EMAIL_BATCH_SIZE = 5;

async function sendAnnouncementEmails(
  addresses: string[],
  input: {
    tournamentTitle: string;
    organizerName: string;
    subject: string;
    message: string;
    link: string;
  },
): Promise<void> {
  for (let i = 0; i < addresses.length; i += EMAIL_BATCH_SIZE) {
    const batch = addresses.slice(i, i + EMAIL_BATCH_SIZE);
    await Promise.all(batch.map((to) => sendAnnouncementEmail(to, input)));
  }
}
