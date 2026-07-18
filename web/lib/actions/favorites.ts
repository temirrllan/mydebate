"use server";

// Server Actions избранного (Этап 4, spec §7 "Favorites: add/remove, list" +
// §9.4 "Favorites (add, remove, list)"). `list` реализован в
// lib/profile/queries.ts (getFavoriteTournaments) — здесь только мутация
// (toggle) и лёгкий хелпер для пометки ❤️ в каталоге без N+1 запросов.

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { TournamentStatus } from "@/lib/enums";

export type ToggleFavoriteResult =
  | { ok: true; favorited: boolean }
  | { ok: false; error: string };

/**
 * Добавляет/убирает турнир из избранного текущего пользователя (unique
 * userId+tournamentId — если запись есть, удаляет её, иначе создаёт).
 * Возвращает структурный результат (не редиректит гостя — это тоггл на
 * иконке ❤️ в каталоге/детали, полноэкранный редирект здесь неуместен;
 * фронт должен показать "Войдите, чтобы добавить в избранное" на `ok:false`).
 */
export async function toggleFavorite(tournamentId: string): Promise<ToggleFavoriteResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Войдите в систему, чтобы добавить турнир в избранное." };
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true },
  });
  if (!tournament || tournament.status !== TournamentStatus.PUBLISHED) {
    return { ok: false, error: "Турнир не найден." };
  }

  const existing = await prisma.favorite.findUnique({
    where: { userId_tournamentId: { userId: user.id, tournamentId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    revalidatePath(`/tournaments/${tournamentId}`);
    revalidatePath("/tournaments");
    revalidatePath("/profile");
    return { ok: true, favorited: false };
  }

  await prisma.favorite.create({ data: { userId: user.id, tournamentId } });
  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/tournaments");
  revalidatePath("/profile");
  return { ok: true, favorited: true };
}

/**
 * Set id-шников избранных турниров текущего пользователя — чтобы каталог мог
 * отрисовать активное состояние ❤️ одним запросом вместо N.
 */
export async function getFavoriteTournamentIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.favorite.findMany({
    where: { userId },
    select: { tournamentId: true },
  });
  return new Set(rows.map((r) => r.tournamentId));
}
