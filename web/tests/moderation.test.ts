import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { Role, TournamentStatus, NotificationType } from "@/lib/enums";
import {
  approveTournament,
  rejectTournament,
  hideTournament,
  deleteTournament,
} from "@/lib/actions/admin";
import { createTournament, createUser, loginAs, resetDb } from "./helpers/fixtures";

describe("модерация турниров", () => {
  let admin: { id: string; email: string; role: string };
  let author: { id: string; email: string; role: string };

  beforeEach(async () => {
    await resetDb();
    admin = await createUser({ email: "admin@test.kz", role: Role.ADMIN });
    author = await createUser({ email: "author@test.kz", role: Role.USER });
    loginAs(admin);
  });

  it("одобрение публикует турнир, повышает автора до организатора и уведомляет его", async () => {
    const t = await createTournament({
      organizerId: author.id,
      status: TournamentStatus.PENDING,
    });

    expect(await approveTournament(t.id)).toEqual({ ok: true });

    const updated = await prisma.tournament.findUnique({ where: { id: t.id } });
    expect(updated?.status).toBe(TournamentStatus.PUBLISHED);

    // Ключевое правило спеки: первый одобренный турнир делает автора ORGANIZER.
    const promoted = await prisma.user.findUnique({ where: { id: author.id } });
    expect(promoted?.role).toBe(Role.ORGANIZER);

    const notification = await prisma.notification.findFirst({
      where: { userId: author.id, type: NotificationType.TOURNAMENT_PUBLISHED },
    });
    expect(notification).not.toBeNull();
  });

  it("одобрение НЕ понижает роль админа-автора до организатора", async () => {
    const t = await createTournament({ organizerId: admin.id, status: TournamentStatus.PENDING });

    await approveTournament(t.id);

    const stillAdmin = await prisma.user.findUnique({ where: { id: admin.id } });
    expect(stillAdmin?.role).toBe(Role.ADMIN);
  });

  it("отклонение ставит статус REJECTED, сохраняет причину и уведомляет автора", async () => {
    const t = await createTournament({
      organizerId: author.id,
      status: TournamentStatus.PENDING,
    });

    expect(await rejectTournament(t.id, "Уточните программу и место проведения.")).toEqual({
      ok: true,
    });

    const updated = await prisma.tournament.findUnique({ where: { id: t.id } });
    expect(updated?.status).toBe(TournamentStatus.REJECTED);
    expect(updated?.rejectionReason).toBe("Уточните программу и место проведения.");

    const notification = await prisma.notification.findFirst({
      where: { userId: author.id, type: NotificationType.TOURNAMENT_REJECTED },
    });
    expect(notification?.message).toContain("Уточните программу");

    // Отклонение — не повышение: автор остаётся обычным пользователем.
    const stillUser = await prisma.user.findUnique({ where: { id: author.id } });
    expect(stillUser?.role).toBe(Role.USER);
  });

  it("отклонение без причины не проходит", async () => {
    const t = await createTournament({
      organizerId: author.id,
      status: TournamentStatus.PENDING,
    });

    const result = await rejectTournament(t.id, "   ");

    expect(result).toMatchObject({ ok: false });
    const unchanged = await prisma.tournament.findUnique({ where: { id: t.id } });
    expect(unchanged?.status).toBe(TournamentStatus.PENDING);
  });

  it("повторное одобрение отклонённого турнира очищает причину отказа", async () => {
    const t = await createTournament({
      organizerId: author.id,
      status: TournamentStatus.REJECTED,
      rejectionReason: "Старая причина",
    });

    await approveTournament(t.id);

    const updated = await prisma.tournament.findUnique({ where: { id: t.id } });
    expect(updated?.status).toBe(TournamentStatus.PUBLISHED);
    expect(updated?.rejectionReason).toBeNull();
  });

  it("скрытие — это не отклонение: статус HIDDEN, причина не появляется", async () => {
    const t = await createTournament({ organizerId: author.id });

    expect(await hideTournament(t.id)).toEqual({ ok: true });

    const updated = await prisma.tournament.findUnique({ where: { id: t.id } });
    expect(updated?.status).toBe(TournamentStatus.HIDDEN);
    expect(updated?.rejectionReason).toBeNull();
  });

  it("удаление турнира — мягкое (статус DELETED, запись остаётся)", async () => {
    const t = await createTournament({ organizerId: author.id });

    expect(await deleteTournament(t.id)).toEqual({ ok: true });

    const updated = await prisma.tournament.findUnique({ where: { id: t.id } });
    expect(updated).not.toBeNull();
    expect(updated?.status).toBe(TournamentStatus.DELETED);
  });
});
