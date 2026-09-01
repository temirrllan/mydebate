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

/**
 * Ссылка на чек об оплате — ровно тот вид, который возвращает загрузчик
 * (app/api/uploads/payment-receipt/route.ts): «/uploads/receipts/<uuid>.<ext>».
 * Имя файла задаём мы сами (uuid + расширение по сигнатуре содержимого),
 * поэтому шаблон строгий — произвольный путь сюда не подставить.
 */
const receiptUrlSchema = z
  .string()
  .trim()
  .max(300)
  .refine((val) => !val || /^\/uploads\/receipts\/[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/i.test(val), {
    error: "receiptUrlInvalid",
  });

export const registrationSchema = z.object({
  // 1. Личная информация (макет: Full Name / Grade-Course / School-University
  // / Phone Number / Email Address — все обязательны).
  fullName: z.string().trim().min(1, { error: "fullNameRequired" }).max(150),
  gradeOrCourse: z.string().trim().min(1, { error: "gradeRequired" }).max(100),
  schoolOrUniversity: z
    .string()
    .trim()
    .min(1, { error: "schoolRequired" })
    .max(200),
  phone: z.string().trim().min(1, { error: "phoneRequired" }).max(30),
  contactEmail: emailSchema,

  // 2. Информация об участии (макет: Team Name обязателен, остальное —
  // опционально).
  //
  // teamName здесь НЕобязателен, хотя в макете со звёздочкой: обязательность
  // зависит от формата турнира. У дебатов команда есть всегда, у MUN команд
  // нет вовсе — участник едет делегатом, поэтому форма не показывает ему ни
  // названия команды, ни тиммейтов. Формат знает сервер, а не форма, и
  // присланному клиентом признаку доверять нельзя, — так что проверка живёт
  // в lib/actions/registrations.ts, рядом с такой же проверкой чека об
  // оплате, которая зависит от цены.
  teamName: z.string().trim().max(150).optional().or(z.literal("")),
  teammateNames: z.string().trim().max(500).optional().or(z.literal("")),
  experienceLevel: z
    .enum([Level.BEGINNER, Level.INTERMEDIATE, Level.ADVANCED])
    .optional()
    .or(z.literal("")),
  // Язык и комитет — взаимоисключающая пара, зависящая от формата турнира:
  // у дебатов форма показывает «Предпочитаемый язык», у MUN вместо него —
  // «Выбор комитета» (список разделов турнира). Оба поля здесь
  // необязательны по той же причине, что и teamName выше: формат знает
  // сервер, а не форма, поэтому обязательность проверяется в
  // lib/actions/registrations.ts, где формат уже прочитан из БД.
  preferredLanguage: z.string().trim().max(50).optional().or(z.literal("")),
  committee: z.string().trim().max(150).optional().or(z.literal("")),
  additionalInfo: z.string().trim().max(500).optional().or(z.literal("")),

  // 3. Подтверждение оплаты. Путь чека, уже загруженного через
  // app/api/uploads/payment-receipt/route.ts. Здесь поле необязательное:
  // обязательность зависит от цены турнира, которая известна только серверу —
  // проверка в lib/actions/registrations.ts.
  //
  // Формат проверяем строго, как и у обложек: значение приходит из formData,
  // то есть подделывается POST'ом в обход формы, и попадает в ссылку, по
  // которой организатор потом открывает файл.
  receiptUrl: receiptUrlSchema.optional().or(z.literal("")),

  // 4. Согласие (три чекбокса макета объединены в один флаг — по аналогии с
  // registerSchema из lib/validations/auth.ts).
  agree: z
    .boolean()
    .refine((v) => v === true, { error: "agreeTerms" }),
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
  { error: "registrationStatusInvalid" },
);
