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
    .min(3, { error: "subjectRequired" })
    .max(200, { error: "subjectTooLong" }),
  message: z
    .string()
    .trim()
    .min(20, { error: "messageMin20" })
    .max(3000, { error: "messageTooLong3000" }),
});

export type CreateSupportTicketInput = z.infer<typeof createSupportTicketSchema>;
