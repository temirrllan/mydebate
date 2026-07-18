"use server";

// Server Actions регистрации на турнир (Этап 4, spec §7 "Register for a
// tournament" + §9.4 "Registration (register, list participants)").
//
// Форма — простая (см. lib/validations/registration.ts): ШАГ ОПЛАТЫ И
// ЗАГРУЗКА ЧЕКА ИЗ МАКЕТА НЕ РЕАЛИЗОВАНЫ (по договорённости с заказчиком,
// см. заголовок validations/registration.ts).
//
// Критические проверки (никогда не доверяем клиенту — spec §11):
//   1) турнир существует и status = PUBLISHED;
//   2) сейчас < registrationDeadline (иначе регистрация закрыта);
//   3) у пользователя ещё нет Registration на этот турнир (@@unique).

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { TournamentStatus, NotificationType } from "@/lib/enums";
import { isRegistrationOpen, REGISTRATION_SUCCESS_MESSAGE } from "@/lib/format";
import { registrationSchema } from "@/lib/validations/registration";
import { createNotification } from "@/lib/notifications/create";

export type RegistrationActionState =
  | {
      message?: string;
      fieldErrors?: Record<string, string[]>;
      success?: boolean;
    }
  | undefined;

const GENERIC_ERROR = "Что-то пошло не так. Попробуйте позже.";

// ПРИМЕЧАНИЕ (Этап 4, фронтенд-агент): REGISTRATION_SUCCESS_MESSAGE переехал в
// lib/format.ts — "use server" файлы в этой версии Next/Turbopack обязаны
// экспортировать ТОЛЬКО async-функции, если модуль используется клиентским
// компонентом (registerForTournament импортируется в client-форму через
// useActionState) — co-located `export const` строка ломала весь билд. Текст
// не изменился, просто переехал; re-export отсюда невозможен по той же причине.

/**
 * Отправка заявки на участие. Рассчитана на `useActionState`, привязывается
 * к турниру через `.bind(null, tournamentId)` (по аналогии с action'ами в
 * lib/actions/auth.ts). Гость -> редирект на /login (страница турнира и так
 * закрыта proxy.ts, но проверяем повторно на сервере — never trust the client).
 */
export async function registerForTournament(
  tournamentId: string,
  _prevState: RegistrationActionState,
  formData: FormData,
): Promise<RegistrationActionState> {
  const user = await requireUser(`/tournaments/${tournamentId}/register`);

  const raw = {
    fullName: formData.get("fullName"),
    gradeOrCourse: formData.get("gradeOrCourse"),
    schoolOrUniversity: formData.get("schoolOrUniversity"),
    phone: formData.get("phone"),
    contactEmail: formData.get("contactEmail"),
    teamName: formData.get("teamName"),
    teammateNames: formData.get("teammateNames") ?? "",
    experienceLevel: formData.get("experienceLevel") ?? "",
    preferredLanguage: formData.get("preferredLanguage") ?? "",
    additionalInfo: formData.get("additionalInfo") ?? "",
    agree: formData.get("agree") === "on",
  };

  const parsed = registrationSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      status: true,
      registrationDeadline: true,
      organizerId: true,
      title: true,
    },
  });

  // Не палим разницу между "не существует" и "не опубликован" — для чужого
  // пользователя оба случая должны выглядеть одинаково.
  if (!tournament || tournament.status !== TournamentStatus.PUBLISHED) {
    return { message: "Турнир не найден." };
  }

  if (!isRegistrationOpen(tournament.registrationDeadline)) {
    return { message: "Регистрация на этот турнир уже закрыта." };
  }

  const existing = await prisma.registration.findUnique({
    where: { userId_tournamentId: { userId: user.id, tournamentId } },
    select: { id: true },
  });
  if (existing) {
    return { message: "Вы уже зарегистрированы на этот турнир." };
  }

  const { agree: _agree, ...data } = parsed.data;
  void _agree;

  try {
    await prisma.registration.create({
      data: {
        userId: user.id,
        tournamentId,
        fullName: data.fullName,
        gradeOrCourse: data.gradeOrCourse,
        schoolOrUniversity: data.schoolOrUniversity,
        phone: data.phone,
        contactEmail: data.contactEmail,
        teamName: data.teamName,
        teammateNames: data.teammateNames || null,
        experienceLevel: data.experienceLevel || null,
        preferredLanguage: data.preferredLanguage,
        additionalInfo: data.additionalInfo || null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Гонка запросов между проверкой existing и созданием — уникальный
      // индекс @@unique([userId, tournamentId]) поймал дубликат.
      return { message: "Вы уже зарегистрированы на этот турнир." };
    }
    console.error("[registrations] Не удалось создать регистрацию:", error);
    return { message: GENERIC_ERROR };
  }

  // Критическое действие — логируем (spec §11).
  console.log(
    `[registrations] user=${user.id} зарегистрировался на tournament=${tournamentId}`,
  );

  // Уведомление организатору о новом участнике (spec §7 Notifications).
  await createNotification({
    userId: tournament.organizerId,
    type: NotificationType.NEW_REGISTRATION,
    title: "Новый участник",
    message: `${user.firstName} ${user.lastName} зарегистрировался(-лась) на турнир «${tournament.title}».`,
    link: `/tournaments/${tournamentId}`,
  });

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/profile");

  return { success: true, message: REGISTRATION_SUCCESS_MESSAGE };
}

export type CancelRegistrationResult = { ok: true } | { ok: false; error: string };

/**
 * Отмена своей заявки. Не завязана на `useActionState` (нет смысла в форме
 * ради одной кнопки) — используем `getCurrentUser` и возвращаем структурный
 * результат вместо редиректа, чтобы фронт мог показать тост/ошибку не уходя
 * со страницы.
 */
export async function cancelRegistration(tournamentId: string): Promise<CancelRegistrationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Необходимо войти в систему." };

  const registration = await prisma.registration.findUnique({
    where: { userId_tournamentId: { userId: user.id, tournamentId } },
    select: { id: true },
  });
  if (!registration) {
    return { ok: false, error: "Заявка не найдена." };
  }

  await prisma.registration.delete({ where: { id: registration.id } });

  console.log(`[registrations] user=${user.id} отменил заявку на tournament=${tournamentId}`);

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/profile");

  return { ok: true };
}
