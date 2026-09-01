"use client";

// Клиентский двойник translateFieldErrors (lib/i18n/validation.ts).
//
// Мастер создания турнира и форма редактирования проверяют схемы прямо в
// браузере, до отправки, — и получают от zod те же ключи. Без этого хука
// пользователь увидел бы в поле «titleRequired» вместо «Введите название
// турнира».
import { useTranslations } from "next-intl";

import { translateFieldErrorsWith, type FieldErrors } from "./validation";

export function useValidationErrors() {
  const t = useTranslations("validation");
  const translate = (key: string) => (t.has(key) ? t(key) : key);

  return {
    /** Перевести один ключ. */
    translate,
    /** Перевести весь набор ошибок формы. */
    translateFieldErrors: (fieldErrors: FieldErrors) =>
      translateFieldErrorsWith(fieldErrors, translate),
  };
}
