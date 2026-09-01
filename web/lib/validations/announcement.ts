// Zod-схема рассылки участникам турнира (организатор → все зарегистрированные).
//
// Единый источник правды: используется и клиентской формой
// (components/tournaments/announcement-panel.tsx), и сервером
// (lib/actions/announcements.ts). Как и везде в проекте, клиентской проверке
// не доверяем — форма только подсказывает, решает сервер.

import { z } from "zod";
import { RegistrationStatus } from "@/lib/enums";

/** Кому уходит рассылка: всем заявкам или только одному статусу. */
export const ANNOUNCEMENT_AUDIENCE_ALL = "ALL";

export const announcementSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(3, { error: "Введите тему сообщения" })
    .max(150, { error: "Тема не длиннее 150 символов" }),
  message: z
    .string()
    .trim()
    .min(10, { error: "Сообщение должно содержать не менее 10 символов" })
    .max(4000, { error: "Сообщение не длиннее 4000 символов" }),
  // «Всем» или конкретный статус заявки — организатор часто пишет не всем
  // подряд, а, например, только принятым (ссылка на рабочий чат) или только
  // листу ожидания.
  audience: z
    .enum([
      ANNOUNCEMENT_AUDIENCE_ALL,
      RegistrationStatus.PENDING,
      RegistrationStatus.ACCEPTED,
      RegistrationStatus.CONFIRMED,
      RegistrationStatus.WAITLIST,
      RegistrationStatus.REJECTED,
    ])
    .catch(ANNOUNCEMENT_AUDIENCE_ALL),
});

export type AnnouncementInput = z.infer<typeof announcementSchema>;
