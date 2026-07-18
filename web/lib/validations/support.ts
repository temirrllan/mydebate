// Zod-схема формы обращения в поддержку (Этап 7, spec §7 "Support tickets":
// "user submits a change request for date/price/venue; admin processes and
// edits manually"). Единый источник правды — переиспользуется в
// lib/actions/support.ts на сервере (never trust the client). Модель
// SupportTicket допускает гостя (userId nullable, email/name из формы),
// поэтому email всегда обязателен и валидируется отдельно от сессии.

import { z } from "zod";
import { emailSchema } from "@/lib/validations/auth";

export const createSupportTicketSchema = z.object({
  name: z.string().trim().max(200).optional().or(z.literal("")),
  email: emailSchema,
  subject: z
    .string()
    .trim()
    .min(3, { error: "Введите тему обращения" })
    .max(200, { error: "Слишком длинная тема (макс. 200 символов)" }),
  message: z
    .string()
    .trim()
    .min(20, { error: "Сообщение должно содержать не менее 20 символов" })
    .max(3000, { error: "Слишком длинное сообщение (макс. 3000 символов)" }),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
