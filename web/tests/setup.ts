import { vi } from "vitest";

// Каждый тест обязан работать с тестовой базой, а не с dev.db. Переменную
// выставляем ДО того, как какой-либо модуль импортирует lib/prisma (клиент
// читает DATABASE_URL при создании и кэширует его).
process.env.DATABASE_URL = "file:./test.db";
process.env.AUTH_SECRET ??= "test-secret";

// Кэш-хелперы Next вне запроса Next не работают — в тестах они не важны.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

/**
 * Сессия. Экшены зовут requireAdmin()/requireUser() из lib/auth/session, а тот
 * лезет в NextAuth, которого в тестах нет. Подменяем модуль целиком: тест сам
 * говорит, кто «вошёл», через loginAs()/logout() (tests/helpers/session.ts).
 *
 * redirect() в Next прерывает рендер, выбрасывая исключение, — здесь ведём себя
 * так же (RedirectError), чтобы тест мог проверить сам факт редиректа.
 */
export class RedirectError extends Error {
  constructor(public readonly to: string) {
    super(`REDIRECT:${to}`);
  }
}

export const sessionState: { user: CurrentUserLike | null } = { user: null };

export type CurrentUserLike = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isBlocked: boolean;
  image: string | null;
};

vi.mock("@/lib/auth/session", () => ({
  getCurrentUser: async () => sessionState.user,
  requireUser: async (callbackUrl?: string) => {
    if (!sessionState.user) {
      throw new RedirectError(
        callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login",
      );
    }
    return sessionState.user;
  },
  requireRole: async (role: string | string[], callbackUrl?: string) => {
    if (!sessionState.user) {
      throw new RedirectError(
        callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login",
      );
    }
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(sessionState.user.role)) throw new RedirectError("/403");
    return sessionState.user;
  },
  requireAdmin: async () => {
    if (!sessionState.user) throw new RedirectError("/login");
    if (sessionState.user.role !== "ADMIN") throw new RedirectError("/403");
    return sessionState.user;
  },
}));
