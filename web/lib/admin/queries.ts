// Запросы для админ-панели (Этап 6, spec §7 "Moderation" + §9.4 "Admin
// (moderation queue, approve, reject, block user, manage organizers)").
// Только чтение, `import "server-only"`, как и остальные queries/*.ts в
// проекте — auth (requireAdmin) проверяется ВЫЗЫВАЮЩЕЙ страницей/экшном, эти
// функции сами ничего не проверяют (то же разделение "доступ на странице,
// данные здесь", что и lib/profile/queries.ts).
//
// ВАЖНО, в отличие от lib/tournaments/queries.ts (публичный каталог): здесь
// НЕ фильтруем по status = PUBLISHED — админу нужно видеть PENDING/HIDDEN/
// DELETED тоже (модерация, управление).
import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Role, TournamentStatus, SupportTicketStatus } from "@/lib/enums";

const DEFAULT_PAGE_SIZE = 20;

function paginationArgs(page?: number, pageSize?: number) {
  const p = page && page > 0 ? Math.floor(page) : 1;
  const size = pageSize && pageSize > 0 ? Math.floor(pageSize) : DEFAULT_PAGE_SIZE;
  return { page: p, pageSize: size, skip: (p - 1) * size, take: size };
}

// ---------------------------------------------------------------------------
// Дашборд — сводные счётчики
// ---------------------------------------------------------------------------

export type AdminDashboardStats = {
  totalUsers: number;
  totalOrganizers: number;
  totalTournaments: number;
  tournamentsPending: number;
  tournamentsPublished: number;
  tournamentsHidden: number;
  tournamentsRejected: number;
  totalRegistrations: number;
  openTickets: number;
};

/** Счётчики для главной страницы админ-панели. */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const [
    totalUsers,
    totalOrganizers,
    totalTournaments,
    tournamentsPending,
    tournamentsPublished,
    tournamentsHidden,
    tournamentsRejected,
    totalRegistrations,
    openTickets,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: Role.ORGANIZER } }),
    prisma.tournament.count({ where: { status: { not: TournamentStatus.DELETED } } }),
    prisma.tournament.count({ where: { status: TournamentStatus.PENDING } }),
    prisma.tournament.count({ where: { status: TournamentStatus.PUBLISHED } }),
    prisma.tournament.count({ where: { status: TournamentStatus.HIDDEN } }),
    prisma.tournament.count({ where: { status: TournamentStatus.REJECTED } }),
    prisma.registration.count(),
    prisma.supportTicket.count({ where: { status: SupportTicketStatus.OPEN } }),
  ]);

  return {
    totalUsers,
    totalOrganizers,
    totalTournaments,
    tournamentsPending,
    tournamentsPublished,
    tournamentsHidden,
    tournamentsRejected,
    totalRegistrations,
    openTickets,
  };
}

// ---------------------------------------------------------------------------
// Турниры — очередь модерации / общая таблица управления
// ---------------------------------------------------------------------------

export type AdminTournamentListParams = {
  /** Один из TournamentStatus. Не передан -> все статусы (в т.ч. DELETED). */
  status?: string;
  /** Поиск по названию, городу, имени/фамилии организатора. */
  search?: string;
  page?: number;
  pageSize?: number;
};

export type AdminTournamentListItem = {
  id: string;
  title: string;
  status: string;
  format: string;
  locationType: string;
  city: string | null;
  startDate: Date;
  createdAt: Date;
  rejectionReason: string | null;
  organizer: { id: string; firstName: string; lastName: string; email: string };
  registrationsCount: number;
};

export type AdminTournamentListResult = {
  items: AdminTournamentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Таблица турниров для админки (модерация + управление) — все статусы, если не указан фильтр. */
export async function listTournamentsForModeration(
  params: AdminTournamentListParams = {},
): Promise<AdminTournamentListResult> {
  const { page, pageSize, skip, take } = paginationArgs(params.page, params.pageSize);

  const where: Prisma.TournamentWhereInput = {};
  if (params.status) where.status = params.status;

  const search = params.search?.trim();
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { city: { contains: search } },
      { organizer: { firstName: { contains: search } } },
      { organizer: { lastName: { contains: search } } },
      { organizer: { email: { contains: search } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.tournament.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        title: true,
        status: true,
        format: true,
        locationType: true,
        city: true,
        startDate: true,
        createdAt: true,
        rejectionReason: true,
        organizer: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { registrations: true } },
      },
    }),
    prisma.tournament.count({ where }),
  ]);

  return {
    items: rows.map(({ _count, ...rest }) => ({ ...rest, registrationsCount: _count.registrations })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// ---------------------------------------------------------------------------
// Пользователи
// ---------------------------------------------------------------------------

export type AdminUserListParams = {
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
};

export type AdminUserListItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isBlocked: boolean;
  createdAt: Date;
  organizedCount: number;
  registrationsCount: number;
};

export type AdminUserListResult = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Таблица пользователей для админки (поиск по имени/фамилии/email, фильтр по роли). */
export async function listUsersForAdmin(
  params: AdminUserListParams = {},
): Promise<AdminUserListResult> {
  const { page, pageSize, skip, take } = paginationArgs(params.page, params.pageSize);

  const where: Prisma.UserWhereInput = {};
  if (params.role) where.role = params.role;

  const search = params.search?.trim();
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        _count: { select: { organizedTournaments: true, registrations: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: rows.map(({ _count, ...rest }) => ({
      ...rest,
      organizedCount: _count.organizedTournaments,
      registrationsCount: _count.registrations,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// ---------------------------------------------------------------------------
// Организаторы (+ ADMIN, если сам организует) — статистика по статусам турниров
// ---------------------------------------------------------------------------

export type OrganizerStat = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  image: string | null;
  totalTournaments: number;
  published: number;
  pending: number;
  hidden: number;
};

/**
 * Организаторы — со статистикой по своим турнирам (кроме DELETED).
 *
 * Это ORGANIZER'ы плюс те админы, которые сами публикуют турниры: админ без
 * единого турнира — не организатор, и в этом списке ему делать нечего
 * (раньше он висел здесь с нулями во всех колонках).
 */
export async function listOrganizers(): Promise<OrganizerStat[]> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { role: Role.ORGANIZER },
        {
          role: Role.ADMIN,
          organizedTournaments: { some: { status: { not: TournamentStatus.DELETED } } },
        },
      ],
    },
    orderBy: { lastName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      image: true,
      organizedTournaments: {
        where: { status: { not: TournamentStatus.DELETED } },
        select: { status: true },
      },
    },
  });

  return users.map(({ organizedTournaments, ...rest }) => {
    let published = 0;
    let pending = 0;
    let hidden = 0;
    for (const t of organizedTournaments) {
      if (t.status === TournamentStatus.PUBLISHED) published += 1;
      else if (t.status === TournamentStatus.PENDING) pending += 1;
      else if (t.status === TournamentStatus.HIDDEN || t.status === TournamentStatus.REJECTED) hidden += 1;
    }
    return {
      ...rest,
      totalTournaments: organizedTournaments.length,
      published,
      pending,
      hidden,
    };
  });
}

// ---------------------------------------------------------------------------
// Обращения в поддержку
// ---------------------------------------------------------------------------

export type AdminSupportTicketListParams = {
  status?: string;
  page?: number;
  pageSize?: number;
};

export type AdminSupportTicketItem = {
  id: string;
  name: string | null;
  email: string;
  subject: string;
  message: string;
  status: string;
  response: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
};

export type AdminSupportTicketListResult = {
  items: AdminSupportTicketItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

/** Обращения в поддержку для админки — новые (открытые) первыми по умолчанию (сортировка по дате создания, убыв). */
export async function listSupportTickets(
  params: AdminSupportTicketListParams = {},
): Promise<AdminSupportTicketListResult> {
  const { page, pageSize, skip, take } = paginationArgs(params.page, params.pageSize);

  const where: Prisma.SupportTicketWhereInput = {};
  if (params.status) where.status = params.status;

  const [items, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        name: true,
        email: true,
        subject: true,
        message: true,
        status: true,
        response: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
