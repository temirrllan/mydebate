import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { Role, TournamentStatus, TournamentFormat, LocationType, RegistrationType } from "@/lib/enums";
import { sessionState, type CurrentUserLike } from "../setup";

/** Полная очистка тестовой базы — вызывается перед каждым тестом. */
export async function resetDb() {
  await prisma.notification.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.tournamentSection.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.user.deleteMany();
  sessionState.user = null;
}

export async function createUser(overrides: {
  email: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  isBlocked?: boolean;
}) {
  return prisma.user.create({
    data: {
      email: overrides.email,
      firstName: overrides.firstName ?? "Тест",
      lastName: overrides.lastName ?? "Тестов",
      role: overrides.role ?? Role.USER,
      isBlocked: overrides.isBlocked ?? false,
      passwordHash: await bcrypt.hash("password123", 4),
    },
  });
}

/** Дата на N дней вперёд/назад от сегодня, нормализованная в UTC-полночь (как поля дат турнира). */
export function daysFromToday(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days));
}

export async function createTournament(overrides: {
  organizerId: string;
  title?: string;
  status?: string;
  /** Дней от сегодня до старта: отрицательное — турнир уже прошёл. */
  startsInDays?: number;
  /** Дней от сегодня до дедлайна регистрации: отрицательное — регистрация закрыта. */
  deadlineInDays?: number;
  city?: string;
  format?: string;
  rejectionReason?: string | null;
}) {
  const startsInDays = overrides.startsInDays ?? 30;
  const deadlineInDays = overrides.deadlineInDays ?? 20;

  return prisma.tournament.create({
    data: {
      title: overrides.title ?? "Тестовый турнир",
      description: "Описание тестового турнира, достаточно длинное для валидации.",
      format: overrides.format ?? TournamentFormat.DEBATES,
      locationType: LocationType.OFFLINE,
      languages: "Русский",
      city: overrides.city ?? "Астана",
      startDate: daysFromToday(startsInDays),
      registrationDeadline: daysFromToday(deadlineInDays),
      status: overrides.status ?? TournamentStatus.PUBLISHED,
      registrationType: RegistrationType.PLATFORM,
      rejectionReason: overrides.rejectionReason ?? null,
      organizerId: overrides.organizerId,
    },
  });
}

/** «Входим» под пользователем — так же, как это видят requireUser/requireAdmin (см. tests/setup.ts). */
export function loginAs(user: { id: string; email: string; role: string }) {
  sessionState.user = {
    id: user.id,
    email: user.email,
    firstName: "Тест",
    lastName: "Тестов",
    role: user.role,
    isBlocked: false,
    image: null,
  } satisfies CurrentUserLike;
}

export function logout() {
  sessionState.user = null;
}
