"use server";

// Server Actions админ-панели (Этап 6, spec §7 "Moderation"/"Hide / Delete"/
// "Support tickets" + §9.4 "Admin (moderation queue, approve, reject, block
// user, manage organizers)"). КАЖДЫЙ экшн начинается с requireAdmin() —
// никогда не доверяем клиенту, даже если UI уже скрыт от не-админов.
//
// Отклонение (REJECTED + rejectionReason) и скрытие (HIDDEN) — разные статусы:
// отклонённый турнир не прошёл модерацию, скрытый снят с публикации уже после
// неё. approveTournament ВСЕГДА очищает rejectionReason (турнир мог быть до
// этого отклонён и переодобрен вручную админом).
//
// «Удалить турнир»/«Удалить пользователя» — см. комментарии у каждого
// экшна: турнир удаляется МЯГКО (status = DELETED), пользователь — ЖЁСТКО
// (каскады уже в prisma/schema.prisma).

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { maybePromoteToOrganizer } from "@/lib/auth/roles";
import { TournamentStatus, SupportTicketStatus, NotificationType, Role } from "@/lib/enums";
import { ROLE_LABEL } from "@/lib/format";
import {
  rejectTournamentSchema,
  respondToTicketSchema,
  setUserRoleSchema,
  createUserByAdminSchema,
} from "@/lib/validations/admin";
import { createNotification } from "@/lib/notifications/create";
import { translateFieldErrors } from "@/lib/i18n/validation";

export type AdminActionResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };

/** Состояние формы «Добавить пользователя» (useActionState). */
export type CreateUserActionState =
  | { success?: boolean; message?: string; error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

const GENERIC_ERROR = "Что-то пошло не так. Попробуйте позже.";

/** Ревалидация всех админских разделов разом (более дешёвых точечных путей у каждого экшна недостаточно — таблицы могут отображаться в нескольких местах: дашборд, очередь модерации, список турниров). */
function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  revalidatePath("/admin/users");
  revalidatePath("/admin/organizers");
  revalidatePath("/admin/support");
}

// ---------------------------------------------------------------------------
// Модерация турниров
// ---------------------------------------------------------------------------

/**
 * Одобрение турнира: PENDING/REJECTED/HIDDEN -> PUBLISHED, очищает rejectionReason,
 * сразу же вызывает maybePromoteToOrganizer (spec: "author's role auto-
 * becomes ORGANIZER"), уведомляет автора (TOURNAMENT_PUBLISHED).
 */
export async function approveTournament(tournamentId: string): Promise<AdminActionResult> {
  await requireAdmin();

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true, organizerId: true, title: true },
  });
  if (!tournament) return { ok: false, error: "Турнир не найден." };
  if (tournament.status === TournamentStatus.PUBLISHED) {
    return { ok: false, error: "Турнир уже опубликован." };
  }
  if (tournament.status === TournamentStatus.DELETED) {
    return { ok: false, error: "Турнир удалён." };
  }

  try {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.PUBLISHED, rejectionReason: null },
    });
  } catch (error) {
    console.error("[admin] Не удалось одобрить турнир:", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  // Ролевая эскалация USER -> ORGANIZER после первого одобренного турнира —
  // ОБЯЗАТЕЛЬНО сразу после перевода в PUBLISHED (lib/auth/roles.ts).
  await maybePromoteToOrganizer(tournament.organizerId);

  await createNotification({
    userId: tournament.organizerId,
    type: NotificationType.TOURNAMENT_PUBLISHED,
    title: "Турнир опубликован",
    message: `Ваш турнир «${tournament.title}» прошёл модерацию и опубликован на платформе.`,
    link: `/tournaments/${tournamentId}`,
  });

  console.log(`[admin] Турнир ${tournamentId} одобрен и опубликован.`);

  revalidateAdmin();
  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/profile");

  return { ok: true };
}

/**
 * Отклонение турнира: -> REJECTED + rejectionReason (обязателен), уведомляет
 * автора с причиной (spec: "author notified WITH a reason").
 */
export async function rejectTournament(
  tournamentId: string,
  reason: string,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = rejectTournamentSchema.safeParse({ reason });
  if (!parsed.success) {
    return { ok: false, fieldErrors: await translateFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true, organizerId: true, title: true },
  });
  if (!tournament) return { ok: false, error: "Турнир не найден." };
  if (tournament.status === TournamentStatus.DELETED) {
    return { ok: false, error: "Турнир удалён." };
  }

  try {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.REJECTED, rejectionReason: parsed.data.reason },
    });
  } catch (error) {
    console.error("[admin] Не удалось отклонить турнир:", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  await createNotification({
    userId: tournament.organizerId,
    type: NotificationType.TOURNAMENT_REJECTED,
    title: "Турнир отклонён",
    message: `Ваш турнир «${tournament.title}» отклонён модерацией. Причина: ${parsed.data.reason}`,
    link: "/profile?tab=tournaments",
  });

  console.log(`[admin] Турнир ${tournamentId} отклонён. Причина: ${parsed.data.reason}`);

  revalidateAdmin();
  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/profile");

  return { ok: true };
}

/**
 * Скрытие уже опубликованного турнира (НЕ отклонение — rejectionReason не
 * трогаем). Убирает турнир из публичного каталога, но не удаляет запись.
 */
export async function hideTournament(tournamentId: string): Promise<AdminActionResult> {
  await requireAdmin();

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true, organizerId: true, title: true },
  });
  if (!tournament) return { ok: false, error: "Турнир не найден." };
  if (tournament.status !== TournamentStatus.PUBLISHED) {
    return { ok: false, error: "Скрыть можно только опубликованный турнир." };
  }

  try {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.HIDDEN },
    });
  } catch (error) {
    console.error("[admin] Не удалось скрыть турнир:", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  await createNotification({
    userId: tournament.organizerId,
    type: NotificationType.TOURNAMENT_HIDDEN,
    title: "Турнир скрыт",
    message: `Ваш турнир «${tournament.title}» скрыт администратором и больше не отображается в каталоге.`,
    link: "/profile?tab=tournaments",
  });

  console.log(`[admin] Турнир ${tournamentId} скрыт администратором.`);

  revalidateAdmin();
  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/profile");

  return { ok: true };
}

/**
 * Мягкое удаление турнира: status = DELETED (сохраняем регистрации/историю
 * для отчётности — spec §7 "delete removes the tournament from the system",
 * трактуем как "из системы видимости", не как физическое удаление строки, по
 * решению из инструкции задачи Этапа 6).
 */
export async function deleteTournament(tournamentId: string): Promise<AdminActionResult> {
  await requireAdmin();

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true, organizerId: true, title: true },
  });
  if (!tournament) return { ok: false, error: "Турнир не найден." };
  if (tournament.status === TournamentStatus.DELETED) {
    return { ok: false, error: "Турнир уже удалён." };
  }

  try {
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: TournamentStatus.DELETED },
    });
  } catch (error) {
    console.error("[admin] Не удалось удалить турнир:", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  await createNotification({
    userId: tournament.organizerId,
    type: NotificationType.TOURNAMENT_DELETED,
    title: "Турнир удалён",
    message: `Ваш турнир «${tournament.title}» удалён администратором.`,
  });

  console.log(`[admin] Турнир ${tournamentId} удалён (мягко, status=DELETED).`);

  revalidateAdmin();
  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/profile");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Пользователи
// ---------------------------------------------------------------------------

/**
 * Блокировка/разблокировка пользователя. Нельзя заблокировать себя или
 * другого ADMIN. getCurrentUser() в lib/auth/session.ts и так перепроверяет
 * isBlocked из БД на каждый запрос — блокировка вступает в силу немедленно,
 * без ожидания истечения JWT.
 */
export async function setUserBlocked(userId: string, blocked: boolean): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { ok: false, error: "Нельзя заблокировать самого себя." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target) return { ok: false, error: "Пользователь не найден." };
  if (target.role === Role.ADMIN) {
    return { ok: false, error: "Нельзя заблокировать администратора." };
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { isBlocked: blocked } });
  } catch (error) {
    console.error("[admin] Не удалось изменить блокировку пользователя:", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  console.log(`[admin] admin=${admin.id} установил isBlocked=${blocked} для user=${userId}`);

  revalidateAdmin();

  return { ok: true };
}

/**
 * Жёсткое удаление пользователя (каскады см. prisma/schema.prisma:
 * Account/Session/PasswordResetToken/Registration/Favorite/Notification —
 * onDelete: Cascade; SupportTicket.userId — onDelete: SetNull;
 * Tournament.organizerId — onDelete: Cascade, т.е. удаление организатора
 * удалит и все его турниры). Нельзя удалить себя или другого ADMIN.
 */
export async function deleteUser(userId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { ok: false, error: "Нельзя удалить самого себя." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target) return { ok: false, error: "Пользователь не найден." };
  if (target.role === Role.ADMIN) {
    return { ok: false, error: "Нельзя удалить администратора." };
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (error) {
    console.error("[admin] Не удалось удалить пользователя:", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  console.log(`[admin] admin=${admin.id} удалил user=${userId}`);

  revalidateAdmin();
  revalidatePath("/tournaments");

  return { ok: true };
}

/**
 * Ручное назначение роли пользователю (USER / ORGANIZER / ADMIN) — в отличие
 * от авто-повышения USER->ORGANIZER после первого одобренного турнира
 * (maybePromoteToOrganizer), это прямое действие админа. Нельзя менять
 * собственную роль и роль другого ADMIN (админы не разжалуют друг друга —
 * та же защита, что в setUserBlocked/deleteUser). getCurrentUser()
 * перечитывает роль из БД на каждый запрос —
 * новая роль вступает в силу немедленно, без ожидания истечения JWT.
 */
export async function setUserRole(userId: string, role: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();

  if (userId === admin.id) {
    return { ok: false, error: "Нельзя изменить собственную роль." };
  }

  const parsed = setUserRoleSchema.safeParse({ role });
  if (!parsed.success) {
    return { ok: false, error: "Некорректная роль." };
  }
  const nextRole = parsed.data.role;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target) return { ok: false, error: "Пользователь не найден." };
  if (target.role === Role.ADMIN) {
    return { ok: false, error: "Нельзя изменить роль администратора." };
  }
  if (target.role === nextRole) {
    return { ok: false, error: `Пользователь уже имеет роль «${ROLE_LABEL[nextRole] ?? nextRole}».` };
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { role: nextRole } });
  } catch (error) {
    console.error("[admin] Не удалось изменить роль пользователя:", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  console.log(`[admin] admin=${admin.id} изменил роль user=${userId}: ${target.role} -> ${nextRole}`);

  await createNotification({
    userId,
    type: NotificationType.ROLE_CHANGED,
    title: "Ваша роль изменена",
    message: `Администратор назначил вам роль «${ROLE_LABEL[nextRole] ?? nextRole}».`,
    link: "/profile",
  });

  revalidateAdmin();
  revalidatePath("/tournaments");

  return { ok: true };
}

/**
 * Ручное создание пользователя админом (Feature: «Добавить пользователя»).
 * В отличие от публичной регистрации (lib/actions/auth.ts registerUser) — БЕЗ
 * автологина (админ создаёт чужой аккаунт, не входит под ним) и с выбором роли
 * сразу. Пароль хешируется bcrypt (те же правила passwordSchema). Рассчитан на
 * `useActionState`.
 */
export async function createUserByAdmin(
  _prevState: CreateUserActionState,
  formData: FormData,
): Promise<CreateUserActionState> {
  await requireAdmin();

  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    password: formData.get("password"),
    role: formData.get("role"),
  };

  const parsed = createUserByAdminSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: await translateFieldErrors(parsed.error.flatten().fieldErrors) };
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) {
    return { fieldErrors: await translateFieldErrors({ email: ["emailTaken"] }) };
  }

  try {
    const passwordHash = await bcrypt.hash(data.password, 10);
    await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        passwordHash,
        role: data.role,
      },
    });
  } catch (error) {
    console.error("[admin] Не удалось создать пользователя:", error);
    return { error: GENERIC_ERROR };
  }

  console.log(`[admin] создан пользователь ${data.email} с ролью ${data.role}`);

  revalidateAdmin();

  return {
    success: true,
    message: `Пользователь ${data.firstName} ${data.lastName} создан с ролью «${ROLE_LABEL[data.role] ?? data.role}».`,
  };
}

// ---------------------------------------------------------------------------
// Обращения в поддержку
// ---------------------------------------------------------------------------

/** Ответ администратора на обращение: response + status = ANSWERED, уведомляет автора (если есть userId). */
export async function respondToTicket(
  ticketId: string,
  response: string,
): Promise<AdminActionResult> {
  await requireAdmin();

  const parsed = respondToTicketSchema.safeParse({ response });
  if (!parsed.success) {
    return { ok: false, fieldErrors: await translateFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, userId: true, subject: true },
  });
  if (!ticket) return { ok: false, error: "Обращение не найдено." };

  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { response: parsed.data.response, status: SupportTicketStatus.ANSWERED },
    });
  } catch (error) {
    console.error("[admin] Не удалось ответить на обращение:", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (ticket.userId) {
    await createNotification({
      userId: ticket.userId,
      type: NotificationType.SUPPORT_TICKET_ANSWERED,
      title: "Ответ на ваше обращение",
      message: `Администратор ответил на обращение «${ticket.subject}».`,
      link: "/profile?tab=notifications",
    });
  }

  console.log(`[admin] Обращение ${ticketId} получило ответ администратора.`);

  revalidateAdmin();
  revalidatePath("/profile");

  return { ok: true };
}

/** Закрытие обращения без ответа (например, дубликат/спам/решено иначе). */
export async function closeTicket(ticketId: string): Promise<AdminActionResult> {
  await requireAdmin();

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });
  if (!ticket) return { ok: false, error: "Обращение не найдено." };

  try {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: SupportTicketStatus.CLOSED },
    });
  } catch (error) {
    console.error("[admin] Не удалось закрыть обращение:", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  console.log(`[admin] Обращение ${ticketId} закрыто администратором.`);

  revalidateAdmin();

  return { ok: true };
}
