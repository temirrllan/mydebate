// Zod-схемы для форм аутентификации (Этап 2). Единый источник правды —
// переиспользуются и на клиенте (живая валидация форм), и на сервере
// (Server Actions / authorize() в auth.ts) — никогда не доверяем только
// клиентской проверке (spec §11: "Protect API route handlers... never rely
// on hidden UI as the only gate").

import { z } from "zod";

// Пароль: минимум 8 символов, латиница (a-z/A-Z) и хотя бы одна цифра —
// как в макете "Регистрация.png" ("Пароль должен содержать: Минимум 8
// символов / Латинские буквы (a-z, A-Z) / Хотя бы одну цифру (0-9)").
export const passwordSchema = z
  .string()
  .min(8, { error: "Минимум 8 символов" })
  .regex(/[a-zA-Z]/, { error: "Должна быть хотя бы одна латинская буква" })
  .regex(/[0-9]/, { error: "Должна быть хотя бы одна цифра" });

// Отдельные требования пароля для живой индикации на клиенте (checklist в
// макете). Порядок соответствует макету.
//
// Здесь только КЛЮЧ подписи (namespace "auth.password"), а не сам текст:
// список рендерят клиентские формы регистрации и сброса пароля, и подпись им
// нужна на языке интерфейса.
export const passwordRequirements: { key: string; test: (value: string) => boolean }[] = [
  { key: "minLength", test: (v) => v.length >= 8 },
  { key: "letters", test: (v) => /[a-zA-Z]/.test(v) },
  { key: "digit", test: (v) => /[0-9]/.test(v) },
];

export const emailSchema = z
  .string()
  .trim()
  .min(1, { error: "Введите email" })
  .toLowerCase()
  .pipe(z.email({ error: "Введите корректный email" }));

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, { error: "Введите имя" }).max(100),
    lastName: z.string().trim().min(1, { error: "Введите фамилию" }).max(100),
    email: emailSchema,
    phone: z
      .string()
      .trim()
      .max(30)
      .optional()
      .or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string().min(1, { error: "Подтвердите пароль" }),
    agree: z
      .boolean()
      .refine((v) => v === true, { error: "Необходимо согласие с правилами" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Введите пароль" }),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string().min(1, { error: "Подтвердите пароль" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
