// Zod-схемы формы «Создание турнира» (Этап 5, spec §7 "Create tournament (3
// steps)"). Схема разбита по шагам мастера, чтобы фронт мог валидировать
// каждый шаг отдельно перед переходом к следующему (step1Schema/step2Schema/
// step3Schema), плюс createTournamentSchema — полная схема, применяемая на
// сервере при финальной отправке (lib/actions/tournaments.ts). Единый
// источник правды — как и остальные validations/*.ts в проекте, никогда не
// доверяем только клиентской проверке.
//
// Даты приходят из <input type="date"> строками "YYYY-MM-DD" — dateInputSchema/
// optionalDateInputSchema ниже конвертируют их в Date и дают понятное русское
// сообщение об ошибке вместо стандартного zod "Invalid date".

import { z } from "zod";
import { TournamentFormat, LocationType, Level, RegistrationType } from "@/lib/enums";

// ---------------------------------------------------------------------------
// Даты (input type="date" -> Date)
// ---------------------------------------------------------------------------

const dateInputSchema = z
  .string()
  .trim()
  .min(1, { error: "Укажите дату" })
  .transform((val, ctx) => {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Некорректная дата" });
      return z.NEVER;
    }
    return d;
  });

/** Как dateInputSchema, но пустая строка/отсутствие значения -> undefined (для необязательной endDate). */
const optionalDateInputSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((val, ctx) => {
    if (!val) return undefined;
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Некорректная дата" });
      return z.NEVER;
    }
    return d;
  });

/** Полночь текущих суток (та же схема парсинга, что и у <input type="date">) — для проверки "не в прошлом". */
function startOfTodayUTC(): Date {
  return new Date(new Date().toISOString().slice(0, 10));
}

// ---------------------------------------------------------------------------
// Шаг 1 — основная информация
// ---------------------------------------------------------------------------

const step1BaseSchema = z.object({
  title: z.string().trim().min(3, { error: "Введите название турнира" }).max(200),
  format: z.enum([TournamentFormat.DEBATES, TournamentFormat.MUN], {
    error: "Выберите формат турнира",
  }),
  locationType: z.enum([LocationType.ONLINE, LocationType.OFFLINE], {
    error: "Выберите тип проведения",
  }),
  level: z
    .enum([Level.BEGINNER, Level.INTERMEDIATE, Level.ADVANCED])
    .optional()
    .or(z.literal("")),
  languages: z
    .array(z.string().trim().min(1))
    .min(1, { error: "Выберите хотя бы один язык" }),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  venue: z.string().trim().max(200).optional().or(z.literal("")),
  startDate: dateInputSchema,
  endDate: optionalDateInputSchema,
  registrationDeadline: dateInputSchema,
  price: z.coerce
    .number({ error: "Укажите цену участия" })
    .int({ error: "Цена должна быть целым числом" })
    .nonnegative({ error: "Цена не может быть отрицательной" }),
});

/** Общие для Шага 1 и полной схемы проверки (город для OFFLINE, порядок дат, дедлайн не в прошлом). */
function validateStep1Cross(
  data: {
    locationType: string;
    city?: string;
    startDate: Date;
    endDate?: Date;
    registrationDeadline: Date;
  },
  ctx: z.RefinementCtx,
  // При редактировании существующего турнира дедлайн может быть уже в прошлом
  // (турнир идёт/завершён, организатор правит описание) — тогда проверку
  // "не в прошлом" пропускаем. При создании она обязательна.
  opts: { allowPastDeadline?: boolean } = {},
) {
  if (data.locationType === LocationType.OFFLINE && !data.city?.trim()) {
    ctx.addIssue({ code: "custom", message: "Укажите город проведения", path: ["city"] });
  }

  if (data.endDate && data.endDate.getTime() < data.startDate.getTime()) {
    ctx.addIssue({
      code: "custom",
      message: "Дата окончания не может быть раньше даты начала",
      path: ["endDate"],
    });
  }

  if (data.registrationDeadline.getTime() > data.startDate.getTime()) {
    ctx.addIssue({
      code: "custom",
      message: "Дедлайн регистрации не может быть позже даты начала турнира",
      path: ["registrationDeadline"],
    });
  }

  if (!opts.allowPastDeadline && data.registrationDeadline.getTime() < startOfTodayUTC().getTime()) {
    ctx.addIssue({
      code: "custom",
      message: "Дедлайн регистрации не может быть в прошлом",
      path: ["registrationDeadline"],
    });
  }
}

export const step1Schema = step1BaseSchema.superRefine((data, ctx) =>
  validateStep1Cross(data, ctx),
);
export type Step1Input = z.infer<typeof step1Schema>;

/** Шаг 1 при редактировании — как step1Schema, но дедлайн может быть в прошлом. */
export const editStep1Schema = step1BaseSchema.superRefine((data, ctx) =>
  validateStep1Cross(data, ctx, { allowPastDeadline: true }),
);

// ---------------------------------------------------------------------------
// Шаг 2 — описание и разделы
// ---------------------------------------------------------------------------

const sectionSchema = z.object({
  title: z.string().trim().min(1, { error: "Введите заголовок раздела" }).max(150),
  description: z.string().trim().min(1, { error: "Введите описание раздела" }).max(5000),
});
export type TournamentSectionInput = z.infer<typeof sectionSchema>;

const step2BaseSchema = z.object({
  description: z
    .string()
    .trim()
    .min(50, { error: "Описание должно содержать не менее 50 символов" })
    .max(10000),
  // Публичные пути вида "/uploads/tournaments/xxx.jpg", отдаваемые Route
  // Handler'ом загрузки (app/api/uploads/tournament-image/route.ts) — не
  // полноценный URL, поэтому без z.url().
  coverImage: z.string().trim().max(500).optional().or(z.literal("")),
  logoImage: z.string().trim().max(500).optional().or(z.literal("")),
  sections: z.array(sectionSchema).max(20, { error: "Не более 20 разделов" }).optional(),
});

export const step2Schema = step2BaseSchema;
export type Step2Input = z.infer<typeof step2Schema>;

// ---------------------------------------------------------------------------
// Шаг 3 — контакты и регистрация
// ---------------------------------------------------------------------------

const optionalEmailSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .or(z.literal(""))
  .refine((val) => !val || z.email().safeParse(val).success, {
    error: "Введите корректный email",
  });

const step3BaseSchema = z.object({
  registrationType: z.enum([RegistrationType.PLATFORM, RegistrationType.EXTERNAL], {
    error: "Выберите способ регистрации",
  }),
  externalUrl: z.string().trim().max(500).optional().or(z.literal("")),
  instagram: z.string().trim().max(200).optional().or(z.literal("")),
  telegram: z.string().trim().max(200).optional().or(z.literal("")),
  email: optionalEmailSchema,
});

/** Общая для Шага 3 и полной схемы проверка: externalUrl обязателен и валиден при EXTERNAL. */
function validateStep3Cross(
  data: { registrationType: string; externalUrl?: string },
  ctx: z.RefinementCtx,
) {
  if (data.registrationType !== RegistrationType.EXTERNAL) return;

  const url = data.externalUrl?.trim();
  if (!url) {
    ctx.addIssue({
      code: "custom",
      message: "Укажите ссылку на внешнюю регистрацию",
      path: ["externalUrl"],
    });
    return;
  }

  if (!z.url().safeParse(url).success) {
    ctx.addIssue({
      code: "custom",
      message: "Введите корректную ссылку (URL)",
      path: ["externalUrl"],
    });
  }
}

export const step3Schema = step3BaseSchema.superRefine(validateStep3Cross);
export type Step3Input = z.infer<typeof step3Schema>;

// ---------------------------------------------------------------------------
// Полная схема (сервер, финальная отправка формы создания турнира)
// ---------------------------------------------------------------------------

const createTournamentBaseSchema = step1BaseSchema
  .extend(step2BaseSchema.shape)
  .extend(step3BaseSchema.shape);

export const createTournamentSchema = createTournamentBaseSchema.superRefine((data, ctx) => {
  validateStep1Cross(data, ctx);
  validateStep3Cross(data, ctx);
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

/**
 * Полная схема при РЕДАКТИРОВАНИИ турнира организатором. Идентична
 * createTournamentSchema, но допускает дедлайн в прошлом (см. editStep1Schema)
 * — организатор может править уже идущий/завершённый турнир.
 */
export const editTournamentSchema = createTournamentBaseSchema.superRefine((data, ctx) => {
  validateStep1Cross(data, ctx, { allowPastDeadline: true });
  validateStep3Cross(data, ctx);
});

export type EditTournamentInput = z.infer<typeof editTournamentSchema>;
