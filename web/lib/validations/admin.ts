// Zod-схемы для админских мутаций (Этап 6, spec §7 "Moderation" / "Support
// tickets"). Единый источник правды — как и остальные validations/*.ts,
// используется в lib/actions/admin.ts на сервере (never trust the client).

import { z } from "zod";

import { Role } from "@/lib/enums";
import { emailSchema, passwordSchema } from "@/lib/validations/auth";

/** Роли — из lib/enums.ts (единый источник правды), а не строковыми литералами. */
const roleSchema = z.enum([Role.USER, Role.ORGANIZER, Role.ADMIN], { error: "roleInvalid" });

/** Причина отклонения турнира — обязательна (spec: "author notified WITH a reason"). */
export const rejectTournamentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, { error: "rejectionReasonRequired" })
    .max(1000, { error: "rejectionReasonTooLong" }),
});
export type RejectTournamentInput = z.infer<typeof rejectTournamentSchema>;

/** Ответ администратора на обращение в поддержку. */
export const respondToTicketSchema = z.object({
  response: z
    .string()
    .trim()
    .min(1, { error: "responseRequired" })
    .max(3000, { error: "responseTooLong" }),
});
export type RespondToTicketInput = z.infer<typeof respondToTicketSchema>;

/** Назначение роли пользователю админом вручную (админ-панель, setUserRole). */
export const setUserRoleSchema = z.object({
  role: roleSchema,
});
export type SetUserRoleInput = z.infer<typeof setUserRoleSchema>;

/**
 * Создание пользователя админом вручную (админ-панель, createUserByAdmin).
 * Пароль по тем же правилам, что и обычная регистрация (переиспользуем
 * passwordSchema/emailSchema); роль выбирается админом сразу.
 */
export const createUserByAdminSchema = z.object({
  firstName: z.string().trim().min(1, { error: "firstNameRequired" }).max(100),
  lastName: z.string().trim().min(1, { error: "lastNameRequired" }).max(100),
  email: emailSchema,
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  password: passwordSchema,
  role: roleSchema,
});
export type CreateUserByAdminInput = z.infer<typeof createUserByAdminSchema>;
