"use server";

// Server Actions создания/чтения-для-организатора турниров (Этап 5, spec §7
// "Create tournament (3 steps)" + §9.4 "Tournaments (create)").
//
// Модерация (approve/reject, TOURNAMENT_PUBLISHED/TOURNAMENT_REJECTED
// уведомления, maybePromoteToOrganizer) — Этап 6, здесь НЕ вызывается.
// Турнир создаётся сразу со status = PENDING и не виден в публичном каталоге
// (lib/tournaments/queries.ts фильтрует по status = PUBLISHED).
//
// Загрузка обложки/логотипа — отдельный Route Handler
// (app/api/uploads/tournament-image/route.ts), не Server Action: у Server
// Actions в этой версии Next.js лимит тела запроса по умолчанию 1 МБ, а
// файлы должны приниматься до 5 МБ.

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  TournamentStatus,
  RegistrationType,
  NotificationType,
  Role,
  formatLanguages,
} from "@/lib/enums";
import { createTournamentSchema, editTournamentSchema } from "@/lib/validations/tournament";
import { EDIT_TOURNAMENT_SUCCESS_MESSAGE } from "@/lib/format";
import { createNotification } from "@/lib/notifications/create";

export type CreateTournamentActionState =
  | {
      message?: string;
      fieldErrors?: Record<string, string[]>;
      success?: boolean;
      tournamentId?: string;
    }
  | undefined;

const GENERIC_ERROR = "Что-то пошло не так. Попробуйте позже.";

/**
 * Отправка формы «Создание турнира» (3 шага мастера собираются во ФРОНТЕ в
 * один FormData на финальном шаге — сервер валидирует всё целиком через
 * createTournamentSchema). Рассчитана на `useActionState`.
 *
 * Контракт полей FormData:
 *  - обычные текстовые/числовые/date-поля — по имени напрямую (title,
 *    format, locationType, level, city, address, venue, startDate, endDate,
 *    registrationDeadline, price, description, coverImage, logoImage,
 *    registrationType, externalUrl, instagram, telegram, email);
 *  - languages — несколько полей с одинаковым именем "languages"
 *    (formData.getAll), например чекбоксы языков;
 *  - sections — один текстовый filed "sectionsJson", JSON-строка вида
 *    `[{ "title": "...", "description": "..." }, ...]` (динамический список
 *    произвольной длины неудобно кодировать плоскими полями FormData).
 *  - coverImage/logoImage — публичные пути, УЖЕ загруженные заранее через
 *    POST /api/uploads/tournament-image (см. этот route handler), форма
 *    передаёт сюда только результирующую строку пути, не сам файл.
 */
export async function createTournament(
  _prevState: CreateTournamentActionState,
  formData: FormData,
): Promise<CreateTournamentActionState> {
  const user = await requireUser();
  // Админ создаёт турнир сразу опубликованным, минуя модерацию (Feature); все
  // остальные — со status=PENDING и отправкой в очередь модерации.
  const isAdmin = user.role === Role.ADMIN;

  let sections: unknown = [];
  const sectionsRaw = formData.get("sectionsJson");
  if (typeof sectionsRaw === "string" && sectionsRaw.trim()) {
    try {
      sections = JSON.parse(sectionsRaw);
    } catch {
      return { message: "Некорректный формат разделов описания." };
    }
  }

  const raw = {
    title: formData.get("title"),
    format: formData.get("format"),
    locationType: formData.get("locationType"),
    level: formData.get("level") ?? "",
    languages: formData.getAll("languages").map((v) => String(v)),
    city: formData.get("city") ?? "",
    address: formData.get("address") ?? "",
    venue: formData.get("venue") ?? "",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") ?? "",
    registrationDeadline: formData.get("registrationDeadline"),
    price: formData.get("price"),
    description: formData.get("description"),
    coverImage: formData.get("coverImage") ?? "",
    logoImage: formData.get("logoImage") ?? "",
    sections,
    registrationType: formData.get("registrationType"),
    externalUrl: formData.get("externalUrl") ?? "",
    instagram: formData.get("instagram") ?? "",
    telegram: formData.get("telegram") ?? "",
    email: formData.get("email") ?? "",
  };

  const parsed = createTournamentSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const data = parsed.data;

  let tournamentId: string;
  let title: string;

  try {
    const tournament = await prisma.tournament.create({
      data: {
        title: data.title,
        description: data.description,
        format: data.format,
        locationType: data.locationType,
        level: data.level || null,
        languages: formatLanguages(data.languages),
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        registrationDeadline: data.registrationDeadline,
        price: data.price,
        city: data.city || null,
        address: data.address || null,
        venue: data.venue || null,
        status: isAdmin ? TournamentStatus.PUBLISHED : TournamentStatus.PENDING,
        coverImage: data.coverImage || null,
        logoImage: data.logoImage || null,
        registrationType: data.registrationType,
        // externalUrl имеет смысл только для EXTERNAL — не сохраняем "хвост"
        // от переключения радиокнопки туда-обратно на клиенте.
        externalUrl:
          data.registrationType === RegistrationType.EXTERNAL ? data.externalUrl || null : null,
        instagram: data.instagram || null,
        telegram: data.telegram || null,
        email: data.email || null,
        organizerId: user.id,
        sections: {
          create: (data.sections ?? []).map((s, index) => ({
            title: s.title,
            description: s.description,
            order: index,
          })),
        },
      },
      select: { id: true, title: true },
    });
    tournamentId = tournament.id;
    title = tournament.title;
  } catch (error) {
    console.error("[tournaments] Не удалось создать турнир:", error);
    return { message: GENERIC_ERROR };
  }

  // Критическое действие — логируем (spec §11).
  console.log(
    `[tournaments] user=${user.id} создал турнир=${tournamentId} (status=${isAdmin ? "PUBLISHED" : "PENDING"})`,
  );

  if (isAdmin) {
    // Админ публикует сразу — модерация не нужна, админов не уведомляем.
    await createNotification({
      userId: user.id,
      type: NotificationType.TOURNAMENT_PUBLISHED,
      title: "Турнир опубликован",
      message: `Ваш турнир «${title}» создан и сразу опубликован на платформе.`,
      link: `/tournaments/${tournamentId}`,
    });

    revalidatePath("/tournaments");
    revalidatePath("/profile");

    return {
      success: true,
      tournamentId,
      message: "Турнир создан и сразу опубликован (без модерации).",
    };
  }

  // Уведомление автору о том, что заявка отправлена на модерацию (spec §7).
  await createNotification({
    userId: user.id,
    type: NotificationType.TOURNAMENT_SUBMITTED,
    title: "Турнир отправлен на модерацию",
    message: `Ваш турнир «${title}» отправлен на модерацию. Мы уведомим вас о результате.`,
    link: "/profile?tab=tournaments",
  });

  // Уведомление всех админов — новый турнир ждёт модерации (spec §7 "notify
  // admin"). Очередь модерации сама по себе — Этап 6, здесь только событие.
  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true },
  });
  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.id,
        type: NotificationType.NEW_TOURNAMENT_PENDING,
        title: "Новый турнир на модерации",
        message: `Организатор ${user.firstName} ${user.lastName} отправил турнир «${title}» на модерацию.`,
        link: "/admin/moderation",
      }),
    ),
  );

  revalidatePath("/tournaments");
  revalidatePath("/profile");

  return {
    success: true,
    tournamentId,
    message: "Турнир отправлен на модерацию. Мы уведомим вас о результате рассмотрения.",
  };
}

// ---------------------------------------------------------------------------
// Редактирование турнира организатором (Этап 7, spec §7 "Edit tournament":
// "organizer may edit only description and extra info blocks — no
// re-moderation. Date, price, and venue are immutable post-publish and can
// only change via support.")
// ---------------------------------------------------------------------------

export type EditTournamentActionState =
  | {
      message?: string;
      fieldErrors?: Record<string, string[]>;
      success?: boolean;
      tournamentId?: string;
    }
  | undefined;

/**
 * Полное редактирование турнира организатором (или админом любого турнира).
 * Рассчитана на `useActionState`, привязывается к турниру через
 * `.bind(null, tournamentId)` (тот же паттерн, что и registerForTournament).
 *
 * Организатор может менять ВСЕ поля своего турнира — основную информацию,
 * даты/цену/место, описание/обложку/разделы, контакты и способ регистрации
 * (по решению заказчика прежнее ограничение «только описание, даты/цена/место
 * через поддержку» снято). Контракт FormData полностью совпадает с
 * createTournament (см. её шапку). status НЕ меняется — правки уже
 * опубликованного турнира не уходят на повторную модерацию.
 */
export async function editTournament(
  tournamentId: string,
  _prevState: EditTournamentActionState,
  formData: FormData,
): Promise<EditTournamentActionState> {
  const user = await requireUser();
  const isAdmin = user.role === Role.ADMIN;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, organizerId: true, status: true, title: true },
  });

  // Владельцу — только его турнир; админу — любой (Feature: админ правит любой
  // турнир). Для не-владельца-не-админа не палим разницу между "не существует"
  // и "чужой" — оба случая выглядят одинаково.
  if (!tournament || (!isAdmin && tournament.organizerId !== user.id)) {
    return { message: "Турнир не найден." };
  }
  if (tournament.status === TournamentStatus.DELETED) {
    return { message: "Турнир удалён." };
  }

  let sections: unknown = [];
  const sectionsRaw = formData.get("sectionsJson");
  if (typeof sectionsRaw === "string" && sectionsRaw.trim()) {
    try {
      sections = JSON.parse(sectionsRaw);
    } catch {
      return { message: "Некорректный формат разделов описания." };
    }
  }

  const raw = {
    title: formData.get("title"),
    format: formData.get("format"),
    locationType: formData.get("locationType"),
    level: formData.get("level") ?? "",
    languages: formData.getAll("languages").map((v) => String(v)),
    city: formData.get("city") ?? "",
    address: formData.get("address") ?? "",
    venue: formData.get("venue") ?? "",
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") ?? "",
    registrationDeadline: formData.get("registrationDeadline"),
    price: formData.get("price"),
    description: formData.get("description"),
    coverImage: formData.get("coverImage") ?? "",
    logoImage: formData.get("logoImage") ?? "",
    sections,
    registrationType: formData.get("registrationType"),
    externalUrl: formData.get("externalUrl") ?? "",
    instagram: formData.get("instagram") ?? "",
    telegram: formData.get("telegram") ?? "",
    email: formData.get("email") ?? "",
  };

  const parsed = editTournamentSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const data = parsed.data;

  try {
    // Полная замена набора разделов — в транзакции, чтобы не оставить турнир
    // без разделов при сбое на середине (delete прошёл, create — нет).
    await prisma.$transaction([
      prisma.tournamentSection.deleteMany({ where: { tournamentId } }),
      prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          title: data.title,
          description: data.description,
          format: data.format,
          locationType: data.locationType,
          level: data.level || null,
          languages: formatLanguages(data.languages),
          startDate: data.startDate,
          endDate: data.endDate ?? null,
          registrationDeadline: data.registrationDeadline,
          price: data.price,
          city: data.city || null,
          address: data.address || null,
          venue: data.venue || null,
          coverImage: data.coverImage || null,
          logoImage: data.logoImage || null,
          registrationType: data.registrationType,
          externalUrl:
            data.registrationType === RegistrationType.EXTERNAL ? data.externalUrl || null : null,
          instagram: data.instagram || null,
          telegram: data.telegram || null,
          email: data.email || null,
          // status НЕ трогаем — без повторной модерации.
          sections: {
            create: (data.sections ?? []).map((s, index) => ({
              title: s.title,
              description: s.description,
              order: index,
            })),
          },
        },
      }),
    ]);
  } catch (error) {
    console.error("[tournaments] Не удалось отредактировать турнир:", error);
    return { message: GENERIC_ERROR };
  }

  // Критическое действие — логируем (spec §11).
  console.log(`[tournaments] user=${user.id} отредактировал турнир=${tournamentId}`);

  // Уведомление участникам об изменении (spec §7 "tournament changed") —
  // только если турнир уже опубликован и виден участникам; для PENDING/HIDDEN
  // (черновик/на модерации/отклонён) уведомлять некого, регистраций там ещё
  // нет по определению флоу.
  if (tournament.status === TournamentStatus.PUBLISHED) {
    const registrations = await prisma.registration.findMany({
      where: { tournamentId },
      select: { userId: true },
    });
    await Promise.all(
      registrations.map((r) =>
        createNotification({
          userId: r.userId,
          type: NotificationType.TOURNAMENT_CHANGED,
          title: "Турнир изменён",
          message: `Организатор обновил информацию о турнире «${tournament.title}».`,
          link: `/tournaments/${tournamentId}`,
        }),
      ),
    );
  }

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/profile");

  return { success: true, tournamentId, message: EDIT_TOURNAMENT_SUCCESS_MESSAGE };
}

export type DeleteOwnTournamentResult = { ok: true } | { ok: false; error: string };

/**
 * Отмена (мягкое удаление) СВОЕГО турнира организатором. Как и админский
 * deleteTournament, переводит статус в DELETED (не физическое удаление — так
 * сохраняются регистрации/история и ничего не «пропадает» из связей). Только
 * владелец или админ; для остальных общий «не найден».
 *
 * Зарегистрированные участники PUBLISHED-турнира уведомляются об отмене
 * (spec §7 Notifications). Возвращаем структурный результат для инлайн-
 * подтверждения на клиенте (не редирект), как cancelRegistration.
 */
export async function deleteOwnTournament(
  tournamentId: string,
): Promise<DeleteOwnTournamentResult> {
  const user = await requireUser();
  const isAdmin = user.role === Role.ADMIN;

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, organizerId: true, status: true, title: true },
  });

  if (!tournament || (!isAdmin && tournament.organizerId !== user.id)) {
    return { ok: false, error: "Турнир не найден." };
  }
  if (tournament.status === TournamentStatus.DELETED) {
    return { ok: false, error: "Турнир уже удалён." };
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: TournamentStatus.DELETED },
  });

  // Критическое действие — логируем (spec §11: "delete tournament").
  console.log(`[tournaments] user=${user.id} отменил (удалил) турнир=${tournamentId}`);

  // Уведомляем зарегистрированных участников об отмене — только если турнир
  // был опубликован и на него могли подать заявки.
  if (tournament.status === TournamentStatus.PUBLISHED) {
    const registrations = await prisma.registration.findMany({
      where: { tournamentId },
      select: { userId: true },
    });
    await Promise.all(
      registrations.map((r) =>
        createNotification({
          userId: r.userId,
          type: NotificationType.TOURNAMENT_DELETED,
          title: "Турнир отменён",
          message: `Организатор отменил турнир «${tournament.title}». Приносим извинения за неудобства.`,
          link: "/tournaments",
        }),
      ),
    );
  }

  revalidatePath("/tournaments");
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/profile");

  return { ok: true };
}
