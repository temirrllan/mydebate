// Перевод сообщений валидации.
//
// Zod-схемы в lib/validations/*.ts хранят не текст ошибки, а КЛЮЧ
// («emailInvalid», «deadlineInPast»). Причина: одна и та же схема работает и
// на сервере (Server Actions), и на клиенте (мастер создания турнира,
// форма редактирования), а язык интерфейса известен только в момент показа.
// Держать текст в схеме означало бы русскую ошибку на казахской странице.
//
// Здесь — две обёртки над словарём (namespace "validation"): для серверного
// кода и для клиентского. Обе устроены одинаково: ключ, которого нет в
// словаре, возвращается как есть.
import { getTranslations } from "next-intl/server";

export type FieldErrors = Record<string, string[] | undefined>;

/** Функция «ключ → текст». Незнакомое значение отдаём без изменений. */
export type ErrorTranslator = (key: string) => string;

function apply(fieldErrors: FieldErrors, translate: ErrorTranslator): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages?.length) result[field] = messages.map(translate);
  }
  return result;
}

/**
 * Перевод ошибок формы в Server Action.
 *
 * ```ts
 * const parsed = schema.safeParse(raw);
 * if (!parsed.success) {
 *   return { fieldErrors: await translateFieldErrors(parsed.error.flatten().fieldErrors) };
 * }
 * ```
 */
export async function translateFieldErrors(
  fieldErrors: FieldErrors,
): Promise<Record<string, string[]>> {
  const translate = await getValidationTranslator();
  return apply(fieldErrors, translate);
}

/** Тот же переводчик отдельно — когда нужно перевести одиночный ключ. */
export async function getValidationTranslator(): Promise<ErrorTranslator> {
  const t = await getTranslations("validation");
  // t.has, а не try/catch: у next-intl обращение к несуществующему ключу
  // пишет ошибку в консоль и возвращает сам ключ. Нам же надо молча пропустить
  // строку, которая ключом и не была (например, текст от самого zod).
  return (key: string) => (t.has(key) ? t(key) : key);
}

/** Перевод набора ошибок уже готовым переводчиком (клиентский случай). */
export function translateFieldErrorsWith(
  fieldErrors: FieldErrors,
  translate: ErrorTranslator,
): Record<string, string[]> {
  return apply(fieldErrors, translate);
}
