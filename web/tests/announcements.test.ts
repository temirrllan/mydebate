import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { Role, RegistrationStatus, NotificationType } from "@/lib/enums";
import { announceToParticipants } from "@/lib/actions/announcements";
import { createTournament, createUser, loginAs, logout, resetDb } from "./helpers/fixtures";

/** Форма рассылки со страницы /tournaments/[id]/participants. */
function announcementForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("subject", "Присоединяйтесь к чату турнира");
  form.set("message", "Ссылка на группу: https://chat.whatsapp.com/example");
  form.set("audience", "ALL");
  for (const [k, v] of Object.entries(overrides)) form.set(k, v);
  return form;
}

async function register(tournamentId: string, userId: string, status: string) {
  return prisma.registration.create({
    data: { tournamentId, userId, status, fullName: "Участник", contactEmail: "p@test.kz" },
  });
}

describe("рассылка участникам турнира", () => {
  let organizer: { id: string; email: string; role: string };
  let alice: { id: string; email: string; role: string };
  let bob: { id: string; email: string; role: string };

  beforeEach(async () => {
    await resetDb();
    organizer = await createUser({ email: "organizer@test.kz", role: Role.ORGANIZER });
    alice = await createUser({ email: "alice@test.kz", role: Role.USER });
    bob = await createUser({ email: "bob@test.kz", role: Role.USER });
  });

  it("создаёт уведомление каждому участнику", async () => {
    const t = await createTournament({ organizerId: organizer.id });
    await register(t.id, alice.id, RegistrationStatus.PENDING);
    await register(t.id, bob.id, RegistrationStatus.ACCEPTED);
    loginAs(organizer);

    const result = await announceToParticipants(t.id, undefined, announcementForm());

    expect(result).toMatchObject({ success: true, recipients: 2 });

    const notifications = await prisma.notification.findMany({
      where: { type: NotificationType.TOURNAMENT_ANNOUNCEMENT },
      select: { userId: true, title: true, link: true },
    });
    expect(notifications).toHaveLength(2);
    expect(notifications.map((n) => n.userId).sort()).toEqual([alice.id, bob.id].sort());
    expect(notifications[0].title).toBe("Присоединяйтесь к чату турнира");
    expect(notifications[0].link).toBe(`/tournaments/${t.id}`);
  });

  it("шлёт только выбранной группе", async () => {
    const t = await createTournament({ organizerId: organizer.id });
    await register(t.id, alice.id, RegistrationStatus.ACCEPTED);
    await register(t.id, bob.id, RegistrationStatus.WAITLIST);
    loginAs(organizer);

    const result = await announceToParticipants(
      t.id,
      undefined,
      announcementForm({ audience: RegistrationStatus.ACCEPTED }),
    );

    expect(result).toMatchObject({ success: true, recipients: 1 });
    const notifications = await prisma.notification.findMany({
      where: { type: NotificationType.TOURNAMENT_ANNOUNCEMENT },
      select: { userId: true },
    });
    expect(notifications).toEqual([{ userId: alice.id }]);
  });

  // Рассылка достаёт до почтовых ящиков реальных людей — доступ к ней строго
  // у владельца турнира (и у админа), проверяется на сервере.
  it("не даёт рассылать по чужому турниру", async () => {
    const t = await createTournament({ organizerId: organizer.id });
    await register(t.id, alice.id, RegistrationStatus.PENDING);
    loginAs(bob);

    const result = await announceToParticipants(t.id, undefined, announcementForm());

    expect(result).toMatchObject({ message: "Турнир не найден." });
    expect(await prisma.notification.count()).toBe(0);
  });

  it("не даёт рассылать гостю", async () => {
    const t = await createTournament({ organizerId: organizer.id });
    await register(t.id, alice.id, RegistrationStatus.PENDING);
    logout();

    const result = await announceToParticipants(t.id, undefined, announcementForm());

    expect(result).toMatchObject({ message: "Необходимо войти в систему." });
    expect(await prisma.notification.count()).toBe(0);
  });

  it("разрешает рассылку админу", async () => {
    const admin = await createUser({ email: "admin@test.kz", role: Role.ADMIN });
    const t = await createTournament({ organizerId: organizer.id });
    await register(t.id, alice.id, RegistrationStatus.PENDING);
    loginAs(admin);

    expect(await announceToParticipants(t.id, undefined, announcementForm())).toMatchObject({
      success: true,
      recipients: 1,
    });
  });

  it("проверяет тему и текст сообщения", async () => {
    const t = await createTournament({ organizerId: organizer.id });
    await register(t.id, alice.id, RegistrationStatus.PENDING);
    loginAs(organizer);

    const result = await announceToParticipants(
      t.id,
      undefined,
      announcementForm({ subject: "", message: "коротко" }),
    );

    expect(result?.fieldErrors?.subject?.length).toBeGreaterThan(0);
    expect(result?.fieldErrors?.message?.length).toBeGreaterThan(0);
    expect(await prisma.notification.count()).toBe(0);
  });

  it("сообщает, если в выбранной группе никого нет", async () => {
    const t = await createTournament({ organizerId: organizer.id });
    loginAs(organizer);

    const result = await announceToParticipants(t.id, undefined, announcementForm());

    expect(result).toMatchObject({ message: "В выбранной группе пока нет участников." });
    expect(await prisma.notification.count()).toBe(0);
  });
});
