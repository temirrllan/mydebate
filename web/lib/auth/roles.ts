// Ролевая эскалация USER -> ORGANIZER (spec §3/§10 + _shared.md: "After a
// user's first approved tournament, their role auto-becomes ORGANIZER").
//
// ВАЖНО ДЛЯ ДРУГИХ АГЕНТОВ (турниры/модерация, Этап 3+): эта функция НЕ
// вызывается автоматически нигде в текущей кодовой базе — модерационный
// экшн "одобрить турнир" (устанавливающий Tournament.status = PUBLISHED)
// ещё не реализован (это Этап 3). Когда будете писать этот экшн, вызовите
// `maybePromoteToOrganizer(organizerId)` СРАЗУ ПОСЛЕ того, как перевели
// турнир в PUBLISHED — до того момента роль пользователя трогать нельзя.
//
// "Первый одобренный турнир" трактуется как: у пользователя уже есть хотя бы
// один турнир со статусом PUBLISHED (текущий одобряемый включительно) И его
// роль ещё USER (ORGANIZER/ADMIN не понижаем и не трогаем повторно).
import "server-only";

import { prisma } from "@/lib/prisma";
import { Role, TournamentStatus } from "@/lib/enums";

export async function maybePromoteToOrganizer(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user || user.role !== Role.USER) return;

  const publishedCount = await prisma.tournament.count({
    where: { organizerId: userId, status: TournamentStatus.PUBLISHED },
  });

  if (publishedCount === 0) return;

  await prisma.user.update({
    where: { id: userId },
    data: { role: Role.ORGANIZER },
  });

  // Логируем критическое действие (spec §11: role escalation — журналировать).
  console.log(
    `[auth] Role escalation: user ${userId} promoted USER -> ORGANIZER (first published tournament).`,
  );
}
