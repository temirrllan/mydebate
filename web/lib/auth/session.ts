// Централизованный хелпер сессия→пользователь/роль. Используется везде
// (Server Components, Server Actions, Route Handlers) вместо прямого вызова
// `auth()` — единая точка правды по спеку §3/§10 ("Centralize the session→
// role helper... and reuse everywhere").
//
// Соглашение по кодам: гость (не аутентифицирован) -> 401, аутентифицирован
// но роль не подходит -> 403. `requireUser`/`requireRole`/`requireAdmin`
// редиректят на /login (для страниц); для Route Handlers используйте
// `getCurrentUser()` напрямую и возвращайте Response с нужным статусом сами
// (см. пример в app/api/.../route.ts, если такие появятся в других этапах).
import "server-only";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isBlocked: boolean;
  image: string | null;
};

/**
 * Возвращает текущего пользователя из сессии + БД (проверяет isBlocked/role
 * актуальность на момент запроса — сессия/JWT может быть "устаревшим", если
 * админ заблокировал пользователя или поменял роль после выдачи токена).
 * Возвращает null для гостя (тоже трактуем как null, если пользователь
 * заблокирован — заблокированный не должен считаться "текущим" нигде,
 * кроме самого factа блокировки).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isBlocked: true,
      image: true,
    },
  });

  if (!user || user.isBlocked) return null;

  return user;
}

/** Гость -> редирект на /login (с callbackUrl). Иначе возвращает пользователя. */
export async function requireUser(callbackUrl?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const suffix = callbackUrl
      ? `?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "";
    redirect(`/login${suffix}`);
  }
  return user;
}

/**
 * Требует одну из перечисленных ролей. Гость -> редирект /login. Авторизован,
 * но роль не подходит -> редирект на /403 (страница "нет доступа") — по
 * аналогии с HTTP 403, но UI-уровне (страницы не могут вернуть чистый статус
 * без прерывания рендера; Route Handlers должны вместо этого возвращать
 * `Response`/`NextResponse` с кодом 403 напрямую).
 */
export async function requireRole(
  role: string | string[],
  callbackUrl?: string,
): Promise<CurrentUser> {
  const user = await requireUser(callbackUrl);
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) {
    redirect("/403");
  }
  return user;
}

export async function requireAdmin(callbackUrl?: string): Promise<CurrentUser> {
  return requireRole(Role.ADMIN, callbackUrl);
}
