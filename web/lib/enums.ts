// Единый источник правды для строковых "enum"-полей схемы Prisma (SQLite не
// поддерживает нативные enum). Каждая константа ниже отражает допустимые
// значения соответствующего String-поля в prisma/schema.prisma — держите их
// в синхронизации при изменении схемы.

// User.role
export const Role = {
  USER: "USER",
  ORGANIZER: "ORGANIZER",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

// User.level / Tournament.level
export const Level = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
} as const;
export type Level = (typeof Level)[keyof typeof Level];

// Tournament.format
export const TournamentFormat = {
  DEBATES: "DEBATES",
  MUN: "MUN",
} as const;
export type TournamentFormat = (typeof TournamentFormat)[keyof typeof TournamentFormat];

// Tournament.locationType
export const LocationType = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
} as const;
export type LocationType = (typeof LocationType)[keyof typeof LocationType];

// Tournament.status
// REJECTED (отклонён модерацией, причина в Tournament.rejectionReason) и HIDDEN
// (снят с публикации админом без отказа) — разные состояния: отклонённый турнир
// не проходил модерацию, скрытый её уже прошёл. Раньше оба писались как HIDDEN,
// и в админке они были неразличимы.
export const TournamentStatus = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  PUBLISHED: "PUBLISHED",
  REJECTED: "REJECTED",
  HIDDEN: "HIDDEN",
  DELETED: "DELETED",
} as const;
export type TournamentStatus = (typeof TournamentStatus)[keyof typeof TournamentStatus];

// Tournament.registrationType
export const RegistrationType = {
  PLATFORM: "PLATFORM",
  EXTERNAL: "EXTERNAL",
} as const;
export type RegistrationType = (typeof RegistrationType)[keyof typeof RegistrationType];

// Registration.status
export const RegistrationStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  CONFIRMED: "CONFIRMED",
  WAITLIST: "WAITLIST",
} as const;
export type RegistrationStatus = (typeof RegistrationStatus)[keyof typeof RegistrationStatus];

// Notification.type (не строгий enum — открытый список, но эти значения используются в коде)
export const NotificationType = {
  TOURNAMENT_PUBLISHED: "TOURNAMENT_PUBLISHED",
  TOURNAMENT_REJECTED: "TOURNAMENT_REJECTED",
  NEW_REGISTRATION: "NEW_REGISTRATION",
  DEADLINE_SOON: "DEADLINE_SOON",
  // Организатору сразу после отправки формы создания турнира (Этап 5).
  TOURNAMENT_SUBMITTED: "TOURNAMENT_SUBMITTED",
  // Всем ADMIN сразу после отправки формы создания турнира — новый турнир
  // ждёт модерации (Этап 5; читается будущей очередью модерации, Этап 6).
  NEW_TOURNAMENT_PENDING: "NEW_TOURNAMENT_PENDING",
  // Организатору, когда админ скрывает/удаляет его турнир (Этап 6,
  // lib/actions/admin.ts hideTournament/deleteTournament) — не путать с
  // TOURNAMENT_REJECTED (это отклонение НА МОДЕРАЦИИ, до публикации).
  TOURNAMENT_HIDDEN: "TOURNAMENT_HIDDEN",
  TOURNAMENT_DELETED: "TOURNAMENT_DELETED",
  // Автору обращения в поддержку — админ ответил (Этап 6, respondToTicket).
  SUPPORT_TICKET_ANSWERED: "SUPPORT_TICKET_ANSWERED",
  // Всем ADMIN сразу после отправки пользователем формы обращения в
  // поддержку (Этап 7, lib/actions/support.ts createSupportTicket) — по
  // аналогии с NEW_TOURNAMENT_PENDING.
  NEW_SUPPORT_TICKET: "NEW_SUPPORT_TICKET",
  // Организатору, когда он редактирует уже опубликованный турнир (Этап 7,
  // lib/actions/tournaments.ts editTournament) — spec §7 "Notifications:
  // tournament changed". Не путать с TOURNAMENT_PUBLISHED/HIDDEN/DELETED.
  TOURNAMENT_CHANGED: "TOURNAMENT_CHANGED",
  // Пользователю, когда админ вручную меняет его роль (админ-панель,
  // lib/actions/admin.ts setUserRole) — не путать с авто-повышением до
  // ORGANIZER после первого одобренного турнира (там TOURNAMENT_PUBLISHED).
  ROLE_CHANGED: "ROLE_CHANGED",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

// SupportTicket.status
export const SupportTicketStatus = {
  OPEN: "OPEN",
  ANSWERED: "ANSWERED",
  CLOSED: "CLOSED",
} as const;
export type SupportTicketStatus = (typeof SupportTicketStatus)[keyof typeof SupportTicketStatus];

// ---------------------------------------------------------------------------
// languages: хранится в БД как строка со значениями через запятую без
// пробелов, например "Русский,English". Используйте эти хелперы вместо
// ручного split/join, чтобы формат не разъезжался по кодовой базе.
// ---------------------------------------------------------------------------

export function parseLanguages(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function formatLanguages(values: string[]): string {
  return values.map((v) => v.trim()).filter(Boolean).join(",");
}
