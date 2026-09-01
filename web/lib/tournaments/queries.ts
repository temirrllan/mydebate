// Запросы каталога турниров (Этап 4, spec §7 "Search"/"Filters" + §9.4
// "Tournaments (list, get one)"). Только чтение — используются из Server
// Components (страницы каталога/детали, которые построит фронтенд-агент).
//
// Правило видимости (см. _shared.md "Key spec rules"): наружу обычному
// пользователю отдаём ТОЛЬКО status = PUBLISHED. DRAFT/PENDING/HIDDEN/DELETED
// сюда никогда не попадают — организатор/админ сценарии (собственные
// турниры, модерация) сюда не относятся и будут отдельными запросами в
// другом этапе.
import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { TournamentStatus } from "@/lib/enums";
import { startOfToday } from "@/lib/format";
import type { TournamentCardData } from "@/components/tournaments/tournament-card";

// ---------------------------------------------------------------------------
// Листинг (каталог)
// ---------------------------------------------------------------------------

export type TournamentOrganizerSummary = {
  id: string;
  firstName: string;
  lastName: string;
  image: string | null;
};

/** Карточка каталога = TournamentCardData + то, что нужно сверху карточки. */
export type TournamentListItem = TournamentCardData & {
  locationType: string;
  organizer: TournamentOrganizerSummary;
};

export type TournamentSort = "nearest" | "newest";

export type TournamentListParams = {
  /** Поиск по названию турнира ИЛИ имени/фамилии организатора. */
  search?: string;
  format?: string;
  locationType?: string;
  city?: string;
  level?: string;
  /** Турниры, начинающиеся не раньше этой даты (фильтр «Дата»). */
  date?: Date | string;
  /** "nearest" (по умолчанию, ближайшие по startDate) | "newest" (по дате добавления). */
  sort?: TournamentSort;
  /** 1-based. */
  page?: number;
  pageSize?: number;
};

export type TournamentListResult = {
  items: TournamentListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const DEFAULT_PAGE_SIZE = 12;

function buildWhere(params: TournamentListParams): Prisma.TournamentWhereInput {
  const where: Prisma.TournamentWhereInput = {
    status: TournamentStatus.PUBLISHED,
  };

  const and: Prisma.TournamentWhereInput[] = [];

  // Каталог — витрина событий, на которые ЕЩЁ МОЖНО попасть: турнир уходит
  // из списка на следующий день после дедлайна регистрации (по просьбе
  // организаторов — раньше он висел до конца самого турнира и собирал заходы
  // людей, которые уже никак не успевали подать заявку).
  //
  // Граница — та же, что у isRegistrationOpen: весь день дедлайна турнир ещё
  // в каталоге и регистрация ещё открыта. Дедлайн по схеме не позже даты
  // начала, так что отдельная проверка «турнир не прошёл» больше не нужна —
  // эта строже.
  //
  // Скрывается ТОЛЬКО каталог. Сама страница турнира, список участников и
  // вкладка «Мои турниры» организатора работают как раньше: они строятся
  // другими запросами (getTournamentDetail, listMyTournaments,
  // listTournamentParticipants), и этот фильтр их не затрагивает — как и
  // историю участия пользователя (lib/profile/queries.ts).
  and.push({ registrationDeadline: { gte: startOfToday() } });

  if (params.format) and.push({ format: params.format });
  if (params.locationType) and.push({ locationType: params.locationType });
  if (params.city) and.push({ city: params.city });
  if (params.level) and.push({ level: params.level });

  if (params.date) {
    const d = typeof params.date === "string" ? new Date(params.date) : params.date;
    if (!Number.isNaN(d.getTime())) {
      and.push({ startDate: { gte: d } });
    }
  }

  const search = params.search?.trim();
  if (search) {
    // SQLite `contains` — регистронезависимо для ASCII "из коробки" (LIKE),
    // для кириллицы регистр может иметь значение (провайдер не поддерживает
    // `mode: "insensitive"` вне Postgres/Mongo). Ищем и по названию, и по
    // имени/фамилии организатора (spec: "Search: by title, organizer, city").
    and.push({
      OR: [
        { title: { contains: search } },
        { city: { contains: search } },
        { organizer: { firstName: { contains: search } } },
        { organizer: { lastName: { contains: search } } },
      ],
    });
  }

  if (and.length > 0) where.AND = and;

  return where;
}

function buildOrderBy(sort: TournamentSort | undefined): Prisma.TournamentOrderByWithRelationInput {
  if (sort === "newest") return { createdAt: "desc" };
  // "nearest" (по умолчанию) — сначала ближайшие турниры по дате начала.
  return { startDate: "asc" };
}

const CARD_SELECT = {
  id: true,
  title: true,
  city: true,
  startDate: true,
  registrationDeadline: true,
  format: true,
  level: true,
  locationType: true,
  coverImage: true,
  organizer: {
    select: { id: true, firstName: true, lastName: true, image: true },
  },
} satisfies Prisma.TournamentSelect;

/** Листинг опубликованных турниров с фильтрами/поиском/сортировкой/пагинацией. */
export async function listTournaments(
  params: TournamentListParams = {},
): Promise<TournamentListResult> {
  const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;
  const pageSize =
    params.pageSize && params.pageSize > 0 ? Math.floor(params.pageSize) : DEFAULT_PAGE_SIZE;

  const where = buildWhere(params);
  const orderBy = buildOrderBy(params.sort);

  const [items, total] = await Promise.all([
    prisma.tournament.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: CARD_SELECT,
    }),
    prisma.tournament.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Города для наполнения фильтра — distinct city среди PUBLISHED турниров. */
export async function getAvailableCities(): Promise<string[]> {
  const rows = await prisma.tournament.findMany({
    // Тот же срез, что и в buildWhere: город турнира с прошедшим дедлайном в
    // фильтре не нужен — по нему всё равно ничего не найдётся.
    where: {
      status: TournamentStatus.PUBLISHED,
      registrationDeadline: { gte: startOfToday() },
      city: { not: null },
    },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });
  return rows.map((r) => r.city).filter((c): c is string => Boolean(c));
}

// ---------------------------------------------------------------------------
// Деталь турнира
// ---------------------------------------------------------------------------

export type TournamentDetail = {
  id: string;
  title: string;
  description: string;
  format: string;
  locationType: string;
  level: string | null;
  languages: string;
  startDate: Date;
  endDate: Date | null;
  registrationDeadline: Date;
  price: number;
  city: string | null;
  address: string | null;
  venue: string | null;
  coverImage: string | null;
  logoImage: string | null;
  registrationType: string;
  externalUrl: string | null;
  paymentMethod: string | null;
  paymentAccount: string | null;
  paymentRecipient: string | null;
  instagram: string | null;
  telegram: string | null;
  tiktok: string | null;
  email: string | null;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
  sections: { id: string; title: string; description: string; order: number }[];
  organizer: {
    id: string;
    firstName: string;
    lastName: string;
    image: string | null;
    email: string;
    city: string | null;
  };
};

// ---------------------------------------------------------------------------
// «Мои турниры» (организатор) — Этап 5
// ---------------------------------------------------------------------------

export type MyTournamentItem = {
  id: string;
  title: string;
  status: string;
  format: string;
  locationType: string;
  city: string | null;
  startDate: Date;
  registrationDeadline: Date;
  price: number;
  coverImage: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  registrationsCount: number;
};

/**
 * Турниры, где текущий пользователь — организатор (ЛЮБОЙ статус, кроме
 * DELETED — удалённые турниры не должны отображаться даже владельцу; спек
 * §7 "Delete: removes the tournament from the system"). Для вкладки «Мои
 * турниры» в профиле организатора — вызывающая страница обязана сама
 * получить userId через requireUser()/requireRole() (эта функция auth не
 * проверяет, как и остальные query-функции в проекте).
 */
export async function listMyTournaments(userId: string): Promise<MyTournamentItem[]> {
  const rows = await prisma.tournament.findMany({
    where: { organizerId: userId, status: { not: TournamentStatus.DELETED } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      format: true,
      locationType: true,
      city: true,
      startDate: true,
      registrationDeadline: true,
      price: true,
      coverImage: true,
      rejectionReason: true,
      createdAt: true,
      _count: { select: { registrations: true } },
    },
  });

  return rows.map(({ _count, ...rest }) => ({ ...rest, registrationsCount: _count.registrations }));
}

/**
 * Деталь турнира по id. Возвращает null, если турнира нет ИЛИ он не
 * PUBLISHED (фронт в обоих случаях показывает 404 — не различаем причины,
 * чтобы не палить существование непубличных турниров чужим пользователям).
 */
export async function getTournamentDetail(id: string): Promise<TournamentDetail | null> {
  const tournament = await prisma.tournament.findFirst({
    where: { id, status: TournamentStatus.PUBLISHED },
    select: {
      id: true,
      title: true,
      description: true,
      format: true,
      locationType: true,
      level: true,
      languages: true,
      startDate: true,
      endDate: true,
      registrationDeadline: true,
      price: true,
      city: true,
      address: true,
      venue: true,
      coverImage: true,
      logoImage: true,
      registrationType: true,
      externalUrl: true,
      paymentMethod: true,
      paymentAccount: true,
      paymentRecipient: true,
      instagram: true,
      telegram: true,
      tiktok: true,
      email: true,
      organizerId: true,
      createdAt: true,
      updatedAt: true,
      sections: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, description: true, order: true },
      },
      organizer: {
        select: { id: true, firstName: true, lastName: true, image: true, email: true, city: true },
      },
    },
  });

  return tournament;
}

// ---------------------------------------------------------------------------
// Редактирование турнира организатором (Этап 7, spec §7 "Edit tournament")
// ---------------------------------------------------------------------------

export type TournamentEditData = {
  id: string;
  title: string;
  description: string;
  format: string;
  locationType: string;
  level: string | null;
  languages: string;
  startDate: Date;
  endDate: Date | null;
  registrationDeadline: Date;
  price: number;
  city: string | null;
  address: string | null;
  venue: string | null;
  status: string;
  rejectionReason: string | null;
  coverImage: string | null;
  logoImage: string | null;
  registrationType: string;
  externalUrl: string | null;
  paymentMethod: string | null;
  paymentAccount: string | null;
  paymentRecipient: string | null;
  instagram: string | null;
  telegram: string | null;
  tiktok: string | null;
  email: string | null;
  organizerId: string;
  sections: { id: string; title: string; description: string; order: number }[];
};

/**
 * Турнир для формы редактирования организатором. Возвращает данные ТОЛЬКО
 * если запрашивающий — владелец турнира (organizerId === userId); иначе
 * `null` (специально не различаем "не найден"/"чужой" — не палим чужие
 * турниры). DELETED турниры недоступны даже владельцу (spec: "delete removes
 * the tournament from the system"). Только владелец правит через этот флоу —
 * у админа свои инструменты (lib/admin/*), не этот запрос.
 */
export async function getTournamentForEdit(
  tournamentId: string,
  userId: string,
  isAdmin = false,
): Promise<TournamentEditData | null> {
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, status: { not: TournamentStatus.DELETED } },
    select: {
      id: true,
      title: true,
      description: true,
      format: true,
      locationType: true,
      level: true,
      languages: true,
      startDate: true,
      endDate: true,
      registrationDeadline: true,
      price: true,
      city: true,
      address: true,
      venue: true,
      status: true,
      rejectionReason: true,
      coverImage: true,
      logoImage: true,
      registrationType: true,
      externalUrl: true,
      paymentMethod: true,
      paymentAccount: true,
      paymentRecipient: true,
      instagram: true,
      telegram: true,
      tiktok: true,
      email: true,
      organizerId: true,
      sections: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, description: true, order: true },
      },
    },
  });

  // Владельцу — только его турнир; админу (isAdmin) — любой (Feature: админ
  // может редактировать любой турнир). Для не-владельца-не-админа не палим
  // разницу между «нет» и «чужой» — одинаково null.
  if (!tournament || (!isAdmin && tournament.organizerId !== userId)) return null;

  return tournament;
}

// ---------------------------------------------------------------------------
// Список участников турнира для организатора (Этап 7, spec §7 "Register for
// a tournament" / §9.4 "Registration (list participants)")
// ---------------------------------------------------------------------------

export type TournamentParticipant = {
  id: string;
  status: string;
  createdAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    image: string | null;
  };
  fullName: string | null;
  gradeOrCourse: string | null;
  schoolOrUniversity: string | null;
  phone: string | null;
  contactEmail: string | null;
  teamName: string | null;
  teammateNames: string | null;
  experienceLevel: string | null;
  /** Язык — у дебатов; на MUN вместо него заполнен committee. */
  preferredLanguage: string | null;
  /** Комитет MUN — заголовок раздела турнира, выбранный участником. */
  committee: string | null;
  additionalInfo: string | null;
  /** Чек об оплате взноса. Открывается только организатору/автору/админу. */
  receiptUrl: string | null;
};

export type TournamentParticipantsResult = {
  tournament: { id: string; title: string };
  participants: TournamentParticipant[];
};

/**
 * Список участников турнира — ТОЛЬКО для владельца-организатора
 * (organizerId === requesterId), иначе `null` (страница-вызывающая сторона
 * сама решает, что показать — 404/redirect, не палим существование чужого
 * турнира). Пагинация не сделана намеренно (см. задачу этапа) — турнир вряд
 * ли соберёт тысячи участников; если понадобится, копировать паттерн
 * `listMyTournaments`/`listUsersForAdmin` (skip/take + count).
 */
export async function listTournamentParticipants(
  tournamentId: string,
  requesterId: string,
): Promise<TournamentParticipantsResult | null> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, title: true, organizerId: true },
  });
  if (!tournament || tournament.organizerId !== requesterId) return null;

  const registrations = await prisma.registration.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      fullName: true,
      gradeOrCourse: true,
      schoolOrUniversity: true,
      phone: true,
      contactEmail: true,
      teamName: true,
      teammateNames: true,
      experienceLevel: true,
      preferredLanguage: true,
      committee: true,
      additionalInfo: true,
      receiptUrl: true,
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, image: true },
      },
    },
  });

  return {
    tournament: { id: tournament.id, title: tournament.title },
    participants: registrations,
  };
}
