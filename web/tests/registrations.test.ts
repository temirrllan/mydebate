import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { Role, TournamentStatus, NotificationType } from "@/lib/enums";
import { registerForTournament, cancelRegistration } from "@/lib/actions/registrations";
import { createTournament, createUser, loginAs, logout, resetDb } from "./helpers/fixtures";
import { RedirectError } from "./setup";

/** Валидная заявка — форма из app/tournaments/[id]/register. */
function registrationForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("fullName", "Санжар Тулегенов");
  form.set("gradeOrCourse", "11 класс");
  form.set("schoolOrUniversity", "НИШ Астана");
  form.set("phone", "+7 701 123 45 67");
  form.set("contactEmail", "sanzhar@test.kz");
  form.set("teamName", "Команда");
  form.set("preferredLanguage", "Русский");
  form.set("agree", "on");
  for (const [k, v] of Object.entries(overrides)) form.set(k, v);
  return form;
}

describe("регистрация на турнир", () => {
  let organizer: { id: string; email: string; role: string };
  let user: { id: string; email: string; role: string };

  beforeEach(async () => {
    await resetDb();
    organizer = await createUser({ email: "organizer@test.kz", role: Role.ORGANIZER });
    user = await createUser({ email: "sanzhar@test.kz", role: Role.USER });
  });

  it("создаёт заявку и уведомляет организатора", async () => {
    const t = await createTournament({ organizerId: organizer.id });
    loginAs(user);

    const result = await registerForTournament(t.id, undefined, registrationForm());
    expect(result).toMatchObject({ success: true });

    const reg = await prisma.registration.findFirst({ where: { tournamentId: t.id } });
    expect(reg).toMatchObject({ userId: user.id, teamName: "Команда" });

    const notification = await prisma.notification.findFirst({
      where: { userId: organizer.id, type: NotificationType.NEW_REGISTRATION },
    });
    expect(notification).not.toBeNull();
  });

  it("требует чек об оплате, если турнир платный", async () => {
    const t = await createTournament({ organizerId: organizer.id, price: 5000 });
    loginAs(user);

    const result = await registerForTournament(t.id, undefined, registrationForm());

    expect(result).toMatchObject({
      fieldErrors: { receiptUrl: ["Приложите чек об оплате взноса"] },
    });
    expect(await prisma.registration.count()).toBe(0);
  });

  it("принимает заявку на платный турнир с приложенным чеком", async () => {
    const t = await createTournament({ organizerId: organizer.id, price: 5000 });
    loginAs(user);

    const receipt = "/uploads/receipts/3f8a1c2e-0b4d-4a11-9c77-2e5b6d1f0a93.pdf";
    const result = await registerForTournament(
      t.id,
      undefined,
      registrationForm({ receiptUrl: receipt }),
    );

    expect(result).toMatchObject({ success: true });
    const reg = await prisma.registration.findFirst({ where: { tournamentId: t.id } });
    expect(reg?.receiptUrl).toBe(receipt);
  });

  it("не требует чек, если турнир бесплатный", async () => {
    const t = await createTournament({ organizerId: organizer.id, price: 0 });
    loginAs(user);

    const result = await registerForTournament(t.id, undefined, registrationForm());

    expect(result).toMatchObject({ success: true });
    const reg = await prisma.registration.findFirst({ where: { tournamentId: t.id } });
    expect(reg?.receiptUrl).toBeNull();
  });

  it("отклоняет подделанную ссылку на чек — принимаем только путь загрузчика", async () => {
    const t = await createTournament({ organizerId: organizer.id, price: 5000 });
    loginAs(user);

    const result = await registerForTournament(
      t.id,
      undefined,
      registrationForm({ receiptUrl: "https://evil.example.com/pwn.pdf" }),
    );

    expect(result).toMatchObject({ fieldErrors: { receiptUrl: ["Некорректная ссылка на чек"] } });
    expect(await prisma.registration.count()).toBe(0);
  });

  it("не пускает гостя — уводит на /login", async () => {
    const t = await createTournament({ organizerId: organizer.id });
    logout();

    await expect(registerForTournament(t.id, undefined, registrationForm())).rejects.toThrow(
      RedirectError,
    );
    expect(await prisma.registration.count()).toBe(0);
  });

  it("не даёт зарегистрироваться дважды на один турнир", async () => {
    const t = await createTournament({ organizerId: organizer.id });
    loginAs(user);

    await registerForTournament(t.id, undefined, registrationForm());
    const second = await registerForTournament(t.id, undefined, registrationForm());

    expect(second).toMatchObject({ message: "Вы уже зарегистрированы на этот турнир." });
    expect(await prisma.registration.count({ where: { tournamentId: t.id } })).toBe(1);
  });

  it("закрывает регистрацию после дедлайна", async () => {
    const t = await createTournament({
      organizerId: organizer.id,
      startsInDays: 10,
      deadlineInDays: -1, // дедлайн был вчера
    });
    loginAs(user);

    const result = await registerForTournament(t.id, undefined, registrationForm());

    expect(result).toMatchObject({ message: "Регистрация на этот турнир уже закрыта." });
    expect(await prisma.registration.count()).toBe(0);
  });

  it("регистрация открыта весь день дедлайна (последний день — ещё можно)", async () => {
    const t = await createTournament({
      organizerId: organizer.id,
      startsInDays: 5,
      deadlineInDays: 0, // дедлайн сегодня
    });
    loginAs(user);

    const result = await registerForTournament(t.id, undefined, registrationForm());
    expect(result).toMatchObject({ success: true });
  });

  it("не даёт зарегистрироваться на неопубликованный турнир", async () => {
    const t = await createTournament({
      organizerId: organizer.id,
      status: TournamentStatus.PENDING,
    });
    loginAs(user);

    const result = await registerForTournament(t.id, undefined, registrationForm());

    expect(result).toMatchObject({ message: "Турнир не найден." });
    expect(await prisma.registration.count()).toBe(0);
  });

  it("отклоняет заявку без согласия с условиями", async () => {
    const t = await createTournament({ organizerId: organizer.id });
    loginAs(user);

    const form = registrationForm();
    form.delete("agree");
    const result = await registerForTournament(t.id, undefined, form);

    expect(result).toHaveProperty("fieldErrors");
    expect(await prisma.registration.count()).toBe(0);
  });

  it("позволяет отменить свою заявку", async () => {
    const t = await createTournament({ organizerId: organizer.id });
    loginAs(user);
    await registerForTournament(t.id, undefined, registrationForm());

    expect(await cancelRegistration(t.id)).toEqual({ ok: true });
    expect(await prisma.registration.count()).toBe(0);
  });
});
