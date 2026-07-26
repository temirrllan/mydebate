// Zod-схемы для настроек профиля (личный кабинет → вкладка «Настройки»).
// Единый источник правды — используются и в клиентских формах, и на сервере
// (lib/actions/profile.ts), never trust the client (spec §11).
//
// Email НЕ редактируется здесь: это логин-идентификатор (User.email @unique,
// на него завязаны сессия и вход) — смена требует отдельного флоу с
// подтверждением, поэтому оставлена read-only с отсылкой в поддержку.

import { z } from "zod";
import { Level } from "@/lib/enums";
import { passwordSchema } from "@/lib/validations/auth";

/** Необязательное строковое поле: пустая строка допустима и трактуется как «не указано». */
const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, { error: "Введите имя" }).max(100),
  lastName: z.string().trim().min(1, { error: "Введите фамилию" }).max(100),
  phone: optionalText(30),
  city: optionalText(100),
  school: optionalText(200),
  major: optionalText(150),
  experience: optionalText(1000),
  bio: optionalText(1000),
  level: z
    .enum([Level.BEGINNER, Level.INTERMEDIATE, Level.ADVANCED])
    .optional()
    .or(z.literal("")),
  // languages — список через запятую (см. lib/enums.ts parse/formatLanguages);
  // на сервере нормализуется перед сохранением.
  languages: optionalText(200),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Введите текущий пароль" }),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, { error: "Подтвердите новый пароль" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "Пароли не совпадают",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    error: "Новый пароль совпадает с текущим",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
