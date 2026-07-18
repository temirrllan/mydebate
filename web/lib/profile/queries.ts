// Запросы для личного кабинета (Этап 4, макет `maket/Профиль.png`: вкладки
// «Мои турниры» (Предстоящие/Прошедшие), «Мои заявки», «Избранное»,
// «Уведомления»). Только для ТЕКУЩЕГО пользователя — вызывающая страница
// обязана получить `userId` через `requireUser()`/`getCurrentUser()`
// (lib/auth/session.ts) и передать его сюда; эти функции сами auth не
// проверяют (принцип разделения: доступ — на странице, данные — здесь).
//
// ВАЖНО: в схеме нет отдельной модели "результат участия" (медали/грамоты
// из макета — "Почетная грамота", "Участник" и т.п.) — мокапный блок
// "Результат" не имеет поля-источника в БД. Отдаём `registration.status`
// (см. lib/enums.ts RegistrationStatus: PENDING/ACCEPTED/CONFIRMED/WAITLIST)
// — фронт сам решает, как маппить статус на бейдж; расширение схемы под
// реальные результаты турнира — отдельная задача, не в рамках Этапа 4.
import "server-only";

import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Мои турниры (регистрации)
// ---------------------------------------------------------------------------

export type ProfileTournamentSummary = {
  id: string;
  title: string;
  city: string | null;
  locationType: string;
  format: string;
  level: string | null;
  startDate: Date;
  registrationDeadline: Date;
  coverImage: string | null;
};

export type ProfileRegistrationItem = {
  id: string; // Registration.id
  status: string;
  createdAt: Date;
  tournament: ProfileTournamentSummary;
};

const TOURNAMENT_SUMMARY_SELECT = {
  id: true,
  title: true,
  city: true,
  locationType: true,
  format: true,
  level: true,
  startDate: true,
  registrationDeadline: true,
  coverImage: true,
} as const;

/** Предстоящие турниры пользователя (startDate >= сейчас), ближайшие первыми. */
export async function getUpcomingRegistrations(userId: string): Promise<ProfileRegistrationItem[]> {
  return prisma.registration.findMany({
    where: { userId, tournament: { startDate: { gte: new Date() } } },
    orderBy: { tournament: { startDate: "asc" } },
    select: {
      id: true,
      status: true,
      createdAt: true,
      tournament: { select: TOURNAMENT_SUMMARY_SELECT },
    },
  });
}

/** Прошедшие турниры пользователя (startDate < сейчас), последние первыми. */
export async function getPastRegistrations(userId: string): Promise<ProfileRegistrationItem[]> {
  return prisma.registration.findMany({
    where: { userId, tournament: { startDate: { lt: new Date() } } },
    orderBy: { tournament: { startDate: "desc" } },
    select: {
      id: true,
      status: true,
      createdAt: true,
      tournament: { select: TOURNAMENT_SUMMARY_SELECT },
    },
  });
}

/** «Мои заявки» — все регистрации пользователя, независимо от даты турнира, последние первыми. */
export async function getMyRegistrations(userId: string): Promise<ProfileRegistrationItem[]> {
  return prisma.registration.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      tournament: { select: TOURNAMENT_SUMMARY_SELECT },
    },
  });
}

// ---------------------------------------------------------------------------
// Избранное
// ---------------------------------------------------------------------------

export type ProfileFavoriteItem = {
  favoriteId: string; // Favorite.id
  addedAt: Date;
  tournament: ProfileTournamentSummary;
};

/** Избранные турниры пользователя, недавно добавленные — первыми. */
export async function getFavoriteTournaments(userId: string): Promise<ProfileFavoriteItem[]> {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      tournament: { select: TOURNAMENT_SUMMARY_SELECT },
    },
  });

  return rows.map((r) => ({
    favoriteId: r.id,
    addedAt: r.createdAt,
    tournament: r.tournament,
  }));
}

// ---------------------------------------------------------------------------
// Уведомления
// ---------------------------------------------------------------------------

export type ProfileNotificationItem = {
  id: string;
  type: string | null;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: Date;
};

/** Последние N уведомлений пользователя, новые первыми. */
export async function getMyNotifications(
  userId: string,
  limit = 20,
): Promise<ProfileNotificationItem[]> {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      isRead: true,
      link: true,
      createdAt: true,
    },
  });
}

/** Количество непрочитанных уведомлений (для бейджа-колокольчика в шапке). */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

// ---------------------------------------------------------------------------
// Сводка для страницы профиля одним вызовом
// ---------------------------------------------------------------------------

export type ProfileDashboard = {
  upcoming: ProfileRegistrationItem[];
  past: ProfileRegistrationItem[];
  favorites: ProfileFavoriteItem[];
  notifications: ProfileNotificationItem[];
  unreadNotificationCount: number;
};

/**
 * Всё необходимое для главной вкладки «Профиль» одним `Promise.all` —
 * чтобы страница не делала 5 последовательных запросов. Вкладки «Мои
 * заявки» и т.д. по-прежнему могут звать гранулярные функции выше отдельно
 * (например, при переходе по прямой ссылке на вкладку).
 */
export async function getProfileDashboard(userId: string): Promise<ProfileDashboard> {
  const [upcoming, past, favorites, notifications, unreadNotificationCount] = await Promise.all([
    getUpcomingRegistrations(userId),
    getPastRegistrations(userId),
    getFavoriteTournaments(userId),
    getMyNotifications(userId, 20),
    getUnreadNotificationCount(userId),
  ]);

  return { upcoming, past, favorites, notifications, unreadNotificationCount };
}
