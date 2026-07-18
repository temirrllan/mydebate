import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { Role, TournamentStatus } from "@/lib/enums";
import {
  approveTournament,
  deleteUser,
  hideTournament,
  rejectTournament,
  setUserBlocked,
  setUserRole,
} from "@/lib/actions/admin";
import { editTournament } from "@/lib/actions/tournaments";
import { cancelRegistration } from "@/lib/actions/registrations";
import { getTournamentDetail } from "@/lib/tournaments/queries";
import { createTournament, createUser, loginAs, logout, resetDb } from "./helpers/fixtures";
import { RedirectError } from "./setup";

// Смысл этих тестов: гейты должны сидеть В САМИХ экшенах/запросах, а не только в
// UI и proxy. Ровно тут и был реальный баг аудита — каталог не проверял
// пользователя на сервере, и заблокированный аккаунт со старым JWT его видел.

describe("контроль доступа: админские экшены", () => {
  let admin: { id: string; email: string; role: string };
  let user: { id: string; email: string; role: string };
  let tournamentId: string;

  beforeEach(async () => {
    await resetDb();
    admin = await createUser({ email: "admin@test.kz", role: Role.ADMIN });
    user = await createUser({ email: "user@test.kz", role: Role.USER });
    const t = await createTournament({ organizerId: user.id, status: TournamentStatus.PENDING });
    tournamentId = t.id;
  });

  it("гость не может одобрить турнир — его уводит на /login", async () => {
    logout();
    await expect(approveTournament(tournamentId)).rejects.toThrow(RedirectError);
  });

  it("обычный пользователь не может одобрить турнир — его уводит на /403", async () => {
    loginAs(user);
    await expect(approveTournament(tournamentId)).rejects.toThrow("REDIRECT:/403");

    const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    expect(t?.status).toBe(TournamentStatus.PENDING);
  });

  it("обычный пользователь не может отклонить турнир, заблокировать и удалить чужой аккаунт", async () => {
    loginAs(user);
    await expect(rejectTournament(tournamentId, "причина")).rejects.toThrow("REDIRECT:/403");
    await expect(hideTournament(tournamentId)).rejects.toThrow("REDIRECT:/403");
    await expect(setUserBlocked(admin.id, true)).rejects.toThrow("REDIRECT:/403");
    await expect(deleteUser(admin.id)).rejects.toThrow("REDIRECT:/403");
    await expect(setUserRole(admin.id, Role.USER)).rejects.toThrow("REDIRECT:/403");
  });

  it("админ не может понизить другого админа, заблокировать или удалить его", async () => {
    const otherAdmin = await createUser({ email: "admin2@test.kz", role: Role.ADMIN });
    loginAs(admin);

    expect(await setUserRole(otherAdmin.id, Role.USER)).toEqual({
      ok: false,
      error: "Нельзя изменить роль администратора.",
    });
    expect(await setUserBlocked(otherAdmin.id, true)).toMatchObject({ ok: false });
    expect(await deleteUser(otherAdmin.id)).toMatchObject({ ok: false });

    const still = await prisma.user.findUnique({ where: { id: otherAdmin.id } });
    expect(still?.role).toBe(Role.ADMIN);
    expect(still?.isBlocked).toBe(false);
  });

  it("админ не может изменить собственную роль (иначе потеряет доступ к админке)", async () => {
    loginAs(admin);
    expect(await setUserRole(admin.id, Role.USER)).toMatchObject({ ok: false });
    const me = await prisma.user.findUnique({ where: { id: admin.id } });
    expect(me?.role).toBe(Role.ADMIN);
  });
});

describe("контроль доступа: чужие объекты (IDOR)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("непубличный турнир не отдаётся в публичной выдаче", async () => {
    const owner = await createUser({ email: "owner@test.kz", role: Role.ORGANIZER });
    const pending = await createTournament({
      organizerId: owner.id,
      status: TournamentStatus.PENDING,
    });
    const rejected = await createTournament({
      organizerId: owner.id,
      status: TournamentStatus.REJECTED,
      rejectionReason: "нет программы",
    });

    expect(await getTournamentDetail(pending.id)).toBeNull();
    expect(await getTournamentDetail(rejected.id)).toBeNull();
  });

  it("чужой турнир нельзя отредактировать", async () => {
    const owner = await createUser({ email: "owner@test.kz", role: Role.ORGANIZER });
    const stranger = await createUser({ email: "stranger@test.kz", role: Role.ORGANIZER });
    const t = await createTournament({ organizerId: owner.id });

    loginAs(stranger);
    const form = new FormData();
    form.set("description", "Пытаюсь переписать чужой турнир, текст достаточной длины.");
    const result = await editTournament(t.id, undefined, form);

    // Чужой турнир для не-владельца неотличим от несуществующего — так и задумано.
    expect(result).toMatchObject({ message: "Турнир не найден." });
    const unchanged = await prisma.tournament.findUnique({ where: { id: t.id } });
    expect(unchanged?.description).not.toContain("Пытаюсь переписать");
  });

  it("чужую заявку нельзя отменить", async () => {
    const owner = await createUser({ email: "owner@test.kz", role: Role.ORGANIZER });
    const participant = await createUser({ email: "p@test.kz" });
    const stranger = await createUser({ email: "stranger@test.kz" });
    const t = await createTournament({ organizerId: owner.id });
    const reg = await prisma.registration.create({
      data: {
        userId: participant.id,
        tournamentId: t.id,
        fullName: "Участник",
        gradeOrCourse: "11 класс",
        schoolOrUniversity: "Школа",
        phone: "+7 700 000 00 00",
        contactEmail: "p@test.kz",
        teamName: "Команда",
        preferredLanguage: "Русский",
      },
    });

    // Отмена ищет заявку по паре (текущий пользователь, турнир), поэтому чужой
    // видит «Заявка не найдена», а сама заявка остаётся на месте.
    loginAs(stranger);
    const result = await cancelRegistration(t.id);

    expect(result).toMatchObject({ ok: false });
    expect(await prisma.registration.findUnique({ where: { id: reg.id } })).not.toBeNull();
  });
});
