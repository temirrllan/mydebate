import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";
import { LOCALES, routing } from "@/i18n/routing";

/**
 * robots.txt — первое, что спрашивает поисковый робот, придя на сайт.
 *
 * Открываем всё, кроме личных и служебных разделов: индексировать форму входа
 * или чужой профиль незачем, а страницы за авторизацией робот всё равно
 * увидит как редирект на /login — и такие «пустышки» портят картину сайта в
 * глазах поисковика.
 *
 * Отдаётся по адресу /robots.txt — Next собирает файл из этого модуля.
 */

/**
 * Обязательно динамически. По умолчанию Next вычислил бы robots.txt на этапе
 * СБОРКИ и намертво вписал туда адрес сайта, известный в тот момент. В Docker
 * сборка идёт с заглушкой вместо настоящего окружения (см. web/Dockerfile),
 * поэтому в готовом образе ссылка на карту сайта указывала бы на localhost.
 */
export const dynamic = "force-dynamic";

/** Закрытые от индексации разделы — пути БЕЗ префикса локали. */
const PRIVATE_PATHS = [
  "/admin",
  "/profile",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/403",
  // Действия внутри турнира требуют входа — роботу там делать нечего.
  "/tournaments/create",
  "/tournaments/*/register",
  "/tournaments/*/edit",
  "/tournaments/*/participants",
];

export default function robots(): MetadataRoute.Robots {
  // Каждый закрытый раздел существует на трёх языках, и запрет надо повторить
  // для каждого адреса: правило "/profile" не закрывает "/kk/profile", и
  // казахская версия личного кабинета уехала бы в индекс.
  const disallow = [
    "/api/",
    ...LOCALES.flatMap((locale) =>
      PRIVATE_PATHS.map((path) =>
        locale === routing.defaultLocale ? path : `/${locale}${path}`,
      ),
    ),
  ];

  return {
    rules: { userAgent: "*", allow: "/", disallow },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
