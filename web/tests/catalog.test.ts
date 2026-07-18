import { beforeEach, describe, expect, it } from "vitest";

import { Role, TournamentStatus, TournamentFormat } from "@/lib/enums";
import { listTournaments } from "@/lib/tournaments/queries";
import { createTournament, createUser, resetDb } from "./helpers/fixtures";

async function titles(params: Parameters<typeof listTournaments>[0] = {}) {
  const result = await listTournaments(params);
  return result.items.map((t) => t.title);
}

describe("каталог турниров", () => {
  let organizer: { id: string };

  beforeEach(async () => {
    await resetDb();
    organizer = await createUser({ email: "organizer@test.kz", role: Role.ORGANIZER });
  });

  it("показывает только опубликованные турниры", async () => {
    await createTournament({ organizerId: organizer.id, title: "Опубликован" });
    await createTournament({
      organizerId: organizer.id,
      title: "На модерации",
      status: TournamentStatus.PENDING,
    });
    await createTournament({
      organizerId: organizer.id,
      title: "Отклонён",
      status: TournamentStatus.REJECTED,
      rejectionReason: "нет программы",
    });
    await createTournament({
      organizerId: organizer.id,
      title: "Скрыт",
      status: TournamentStatus.HIDDEN,
    });
    await createTournament({
      organizerId: organizer.id,
      title: "Удалён",
      status: TournamentStatus.DELETED,
    });

    expect(await titles()).toEqual(["Опубликован"]);
  });

  it("не показывает уже прошедшие турниры", async () => {
    await createTournament({
      organizerId: organizer.id,
      title: "Прошлогодний",
      startsInDays: -300,
      deadlineInDays: -310,
    });
    await createTournament({
      organizerId: organizer.id,
      title: "Сегодняшний",
      startsInDays: 0,
      deadlineInDays: -2,
    });
    await createTournament({
      organizerId: organizer.id,
      title: "Будущий",
      startsInDays: 30,
    });

    const found = await titles();

    // Прошедший ушёл, сегодняшний ещё виден (турнир идёт прямо сейчас).
    expect(found).not.toContain("Прошлогодний");
    expect(found).toEqual(expect.arrayContaining(["Сегодняшний", "Будущий"]));
  });

  it("сортировка «сначала ближайшие» ставит ближайший турнир первым", async () => {
    await createTournament({ organizerId: organizer.id, title: "Через месяц", startsInDays: 30 });
    await createTournament({ organizerId: organizer.id, title: "Через неделю", startsInDays: 7 });
    await createTournament({ organizerId: organizer.id, title: "Через год", startsInDays: 365 });

    expect(await titles({ sort: "nearest" })).toEqual(["Через неделю", "Через месяц", "Через год"]);
  });

  it("фильтрует по формату и городу", async () => {
    await createTournament({
      organizerId: organizer.id,
      title: "MUN в Алматы",
      format: TournamentFormat.MUN,
      city: "Алматы",
    });
    await createTournament({
      organizerId: organizer.id,
      title: "Дебаты в Алматы",
      format: TournamentFormat.DEBATES,
      city: "Алматы",
    });
    await createTournament({
      organizerId: organizer.id,
      title: "MUN в Астане",
      format: TournamentFormat.MUN,
      city: "Астана",
    });

    expect(await titles({ format: TournamentFormat.MUN, city: "Алматы" })).toEqual(["MUN в Алматы"]);
  });

  it("ищет по названию турнира и по фамилии организатора", async () => {
    const other = await createUser({
      email: "saparov@test.kz",
      role: Role.ORGANIZER,
      lastName: "Сапаров",
    });
    await createTournament({ organizerId: organizer.id, title: "Almaty Open Debate" });
    await createTournament({ organizerId: other.id, title: "Great Steppe MUN" });

    expect(await titles({ search: "Almaty" })).toEqual(["Almaty Open Debate"]);
    expect(await titles({ search: "Сапаров" })).toEqual(["Great Steppe MUN"]);
    expect(await titles({ search: "ничего-подобного" })).toEqual([]);
  });
});
