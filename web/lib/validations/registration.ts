// Zod-схема формы «Регистрация на турнир» (Этап 4).
//
// ВАЖНО: по договорённости с заказчиком шаг оплаты (Kaspi) и загрузка чека
// из макета `maket/Регистрация на турнир 1.png` НЕ реализуются — форма
// заканчивается на "Информация об участии" + согласии. Поля ниже — это шаги
// 1 и 2 макета минус блок "3. Подтверждение оплаты".
//
// Единый источник правды — используется и на клиенте (будущая живая
// валидация формы), и на сервере (`lib/actions/registrations.ts`), никогда
// не доверяем только клиентской проверке.

import { z } from "zod";
import { Level, RegistrationStatus } from "@/lib/enums";
import { emailSchema } from "@/lib/validations/auth";

export const registrationSchema = z.object({
  // 1. Личная информация (макет: Full Name / Grade-Course / School-University
  // / Phone Number / Email Address — все обязательны).
  fullName: z.string().trim().min(1, { error: "Введите ваше имя" }).max(150),
  gradeOrCourse: z.string().trim().min(1, { error: "Укажите класс или курс" }).max(100),
  schoolOrUniversity: z
    .string()
    .trim()
    .min(1, { error: "Укажите школу или университет" })
    .max(200),
  phone: z.string().trim().min(1, { error: "Введите номер телефона" }).max(30),
  contactEmail: emailSchema,

  // 2. Информация об участии (макет: Team Name обязателен, остальное —
  // опционально).
  teamName: z.string().trim().min(1, { error: "Введите название команды" }).max(150),
  teammateNames: z.string().trim().max(500).optional().or(z.literal("")),
  experienceLevel: z
    .enum([Level.BEGINNER, Level.INTERMEDIATE, Level.ADVANCED])
    .optional()
    .or(z.literal("")),
  preferredLanguage: z.string().trim().min(1, { error: "Выберите язык" }).max(50),
  additionalInfo: z.string().trim().max(500).optional().or(z.literal("")),

  // 4. Согласие (три чекбокса макета объединены в один флаг — по аналогии с
  // registerSchema из lib/validations/auth.ts).
  agree: z
    .boolean()
    .refine((v) => v === true, { error: "Необходимо подтвердить согласие с условиями" }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

/**
 * Смена статуса заявки организатором (setRegistrationStatus). PENDING здесь
 * допустим осознанно — организатор может вернуть заявку «на рассмотрение»,
 * если передумал.
 */
export const registrationStatusSchema = z.enum(
  [
    RegistrationStatus.PENDING,
    RegistrationStatus.ACCEPTED,
    RegistrationStatus.CONFIRMED,
    RegistrationStatus.WAITLIST,
    RegistrationStatus.REJECTED,
  ],
  { error: "Некорректный статус заявки" },
);
