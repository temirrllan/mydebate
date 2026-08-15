// Ролевые гейты (Этап 2, spec §3/§10). Next.js 16: файл называется `proxy.ts`
// (не `middleware.ts`) — конвенция переименована, поведение то же самое.
// Next 16 запускает proxy на Node.js runtime по умолчанию (см.
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md,
// строка 223), поэтому здесь можно безопасно использовать NextAuth (JWT,
// декодируется без обращения к БД — "оптимистичная" проверка по терминологии
// доков app/guides/authentication#optimistic-checks-with-proxy-optional).
//
// ВАЖНО: это оптимистичная проверка на основе JWT из cookie — она не
// перепроверяет isBlocked/актуальную роль в БД (та проверка — в
// lib/auth/session.ts::getCurrentUser(), используемой в Server
// Components/Actions). Proxy — первая линия защиты, не единственная.
import { NextResponse } from "next/server";

import { auth } from "@/auth";

// Публичные маршруты — доступны гостю без авторизации (spec §3: "View
// landing" ✅ для Guest, плюс статические информационные страницы).
const PUBLIC_PATHS = [
  "/",
  "/about",
  "/contacts",
  "/help",
  "/rules",
  "/privacy",
  "/terms",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/403",
];

// Требуют авторизации (любая роль USER/ORGANIZER/ADMIN) — гость видит только
// редирект на /login.
const AUTH_REQUIRED_PREFIXES = ["/profile"];

// Турниры: СМОТРЕТЬ может любой, ДЕЙСТВОВАТЬ — только вошедший.
//
// Изначально по спеку (§3/§10) каталог был закрыт даже от гостя. Правило
// изменено сознательно: поисковый робот приходит на сайт как гость, и при
// закрытом каталоге Google физически не мог проиндексировать ни одного
// турнира — сайт не находился по запросам вроде «дебатный турнир Алматы».
// Теперь открыты просмотр каталога (/tournaments) и страница турнира
// (/tournaments/<id>), а вход требуется на действиях: создать турнир,
// зарегистрироваться, редактировать, смотреть участников.
//
// Регулярным выражением, а не префиксом: id турнира — произвольный сегмент
// пути, и «/tournaments/<id>/register» простым startsWith не выразить.
const TOURNAMENT_ACTION_PATTERNS = [
  /^\/tournaments\/create$/,
  /^\/tournaments\/[^/]+\/(register|edit|participants)(\/.*)?$/,
];

// Админка. Здесь прокси проверяет только ФАКТ входа: гостя разворачивает на
// /login, а вот подходит ли роль — решает requireAdmin() в
// app/admin/layout.tsx, где роль читается из БД (см. комментарий ниже).
const ADMIN_ONLY_PREFIXES = ["/admin"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const session = req.auth;

  // Публичные страницы и всё, что не попадает под явно защищённые префиксы
  // ниже, пропускаем без ограничений.
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  const isAdminRoute = matchesPrefix(pathname, ADMIN_ONLY_PREFIXES);
  const isAuthRequiredRoute =
    matchesPrefix(pathname, AUTH_REQUIRED_PREFIXES) ||
    TOURNAMENT_ACTION_PATTERNS.some((pattern) => pattern.test(pathname));

  if (!isAdminRoute && !isAuthRequiredRoute) {
    return NextResponse.next();
  }

  // Гость -> редирект на /login с callbackUrl (spec: "гость → redirect
  // /login?callbackUrl=...").
  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Роль здесь НЕ проверяем — намеренно. В JWT она попадает один раз, при
  // входе (см. колбэк jwt в auth.ts), и дальше не обновляется. Из-за этого
  // пользователь, которому только что выдали ADMIN, упирался в /403 до тех
  // пор, пока не выйдет и не зайдёт заново, — а по базе он уже администратор.
  //
  // Отказ в доступе выдаёт requireAdmin() в app/admin/layout.tsx: он читает
  // роль из БД на каждый рендер и отправляет чужих на /403. То есть проверка
  // никуда не делась, просто выполняется там, где данные актуальны. Заодно
  // это чинит и обратный случай: у снятого админа JWT ещё говорит ADMIN, и
  // пропускала его как раз проверка здесь.
  return NextResponse.next();
});

export const config = {
  // Не запускаем proxy на статике/служебных запросах и на самих роутах
  // NextAuth (/api/auth/*) — они должны быть доступны без ролевых проверок.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
