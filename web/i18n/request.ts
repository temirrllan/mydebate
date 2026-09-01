// Конфигурация next-intl на стороне сервера: какая локаль у текущего запроса и
// какой словарь к ней подгрузить. Вызывается на каждый рендер и на каждый
// Server Action, где спрашивают перевод.
import { getRequestConfig } from "next-intl/server";

import { routing, type Locale } from "./routing";

function isSupported(value: string | undefined): value is Locale {
  return Boolean(value) && (routing.locales as readonly string[]).includes(value!);
}

export default getRequestConfig(async ({ requestLocale }) => {
  // Берём локаль из requestLocale, а НЕ из `next/root-params`, хотя типы
  // next-intl помечают его устаревшим. Причина практическая: root-params по
  // документации Next нельзя вызывать из Server Actions и Route Handlers
  // (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/
  // next-root-params.md), а нам нужны переводы именно там — сообщения
  // валидации форм и письма участникам приходят из экшенов.
  const requested = await requestLocale;

  // Сегмент [locale] работает как catch-all: на /unknown.txt сюда прилетит
  // мусор. Непонятное значение молча заменяем локалью по умолчанию, иначе
  // импорт словаря упадёт и страница отдаст 500 вместо 404.
  const locale: Locale = isSupported(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    // Часовой пояс фиксируем явно: без него сервер форматирует даты в UTC, а
    // браузер — в местном поясе, и React ругается на расхождение разметки.
    timeZone: "Asia/Almaty",
  };
});
