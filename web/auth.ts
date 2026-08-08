// NextAuth (Auth.js v5) — конфигурация. Этап 2 (авторизация).
//
// Провайдер: Credentials (email + пароль). Google OAuth пока НЕ подключён
// (см. AGENTS.md/задачу Этапа 2) — кнопка в UI присутствует, но disabled.
//
// Стратегия сессий: JWT (не "database"), потому что Credentials-провайдер по
// умолчанию не поддерживает database-стратегию без дополнительного слоя
// (NextAuth требует либо явного `session.strategy: "jwt"`, либо чтобы
// Credentials был единственным провайдером — что и есть в нашем случае, но
// мы всё равно фиксируем стратегию явно для ясности и на случай будущего
// добавления Google). Роль и id пользователя кладём в JWT в колбэке `jwt`,
// затем прокидываем их в `session` в колбэке `session` — см. `types/next-auth.d.ts`
// для расширения типов Session/JWT.
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { loginSchema } from "@/lib/validations/auth";

/**
 * Имя/фамилия из Google-профиля: предпочитаем структурированные given_name/
 * family_name; если их нет — делим полное имя по первому пробелу. Пустая
 * фамилия допустима (в БД поле обязательное, поэтому подставляем пробел-фолбэк
 * на пустую строку невозможно — кладём то, что есть, а lastName минимум "").
 */
function splitGoogleName(
  fullName: string | null | undefined,
  profile: { given_name?: string; family_name?: string } | undefined,
): { firstName: string; lastName: string } {
  const given = profile?.given_name?.trim();
  const family = profile?.family_name?.trim();
  if (given || family) {
    return { firstName: given || family || "Пользователь", lastName: family && given ? family : "" };
  }
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "Пользователь",
    lastName: parts.slice(1).join(" ") || "",
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  // За обратным прокси (Vercel, Caddy, nginx) запрос приходит на приложение с
  // внутренним Host, а настоящий домен — в X-Forwarded-Host. Без trustHost
  // Auth.js отказывается доверять этому заголовку и падает с UntrustedHost при
  // любом входе на проде. Домен для callback'ов и ссылок берётся из AUTH_URL
  // (см. .env.example), так что доверие заголовку не открывает подмену хоста.
  trustHost: true,
  pages: {
    // Кастомная страница логина — чтобы NextAuth не редиректил на свою
    // дефолтную /api/auth/signin при отсутствии сессии.
    signIn: "/login",
  },
  providers: [
    // Google OAuth. Client ID/Secret берутся из AUTH_GOOGLE_ID/
    // AUTH_GOOGLE_SECRET (env) автоматически по конвенции Auth.js v5.
    Google({
      // Разрешаем связывание с существующим аккаунтом по email: Google уже
      // подтвердил владение почтой, поэтому вход через Google в аккаунт с тем
      // же email, что был заведён по паролю, безопасен (см. также signIn callback).
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(rawCredentials) {
        // Валидируем форму ещё раз на сервере — не доверяем клиенту (spec §11).
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        // Нет пользователя, или это OAuth-аккаунт без пароля (passwordHash
        // null) — единое сообщение "Неверный Email или пароль" на клиенте
        // не различает эти случаи (не раскрываем, существует ли email).
        if (!user || !user.passwordHash) return null;

        if (user.isBlocked) {
          // Заблокированный пользователь не должен иметь возможность войти.
          return null;
        }

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordsMatch) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    /**
     * Google-вход: гарантируем, что в НАШЕЙ таблице User есть строка для этого
     * email (без адаптера NextAuth сам её не создаёт). Первый вход — создаём
     * пользователя из Google-профиля (без пароля), повторный — находим по
     * email. Заблокированного не пускаем. Credentials-вход сюда тоже заходит,
     * но там всё уже проверено в authorize() — просто пропускаем.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.toLowerCase();
      if (!email) return false;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        if (existing.isBlocked) return false;
        // Подтягиваем аватар из Google, если у нас его ещё нет.
        if (!existing.image && user.image) {
          await prisma.user.update({ where: { id: existing.id }, data: { image: user.image } });
        }
        return true;
      }

      const { firstName, lastName } = splitGoogleName(
        user.name,
        profile as { given_name?: string; family_name?: string } | undefined,
      );
      await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          image: user.image ?? null,
          emailVerified: new Date(), // email подтверждён Google
          role: Role.USER,
          // passwordHash не задаём — это OAuth-аккаунт без пароля.
        },
      });
      console.log(`[auth] Регистрация через Google: ${email}`);
      return true;
    },

    async jwt({ token, user, account }) {
      // `user`/`account` присутствуют только сразу после успешного signIn.
      if (user) {
        if (account?.provider === "google") {
          // user.id здесь — это Google sub, а не наш cuid. Достаём наш
          // внутренний id и роль по email (строка гарантированно есть после
          // signIn callback выше).
          const dbUser = await prisma.user.findUnique({
            where: { email: (user.email ?? "").toLowerCase() },
            select: { id: true, role: true },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
          }
        } else {
          token.id = user.id as string;
          token.role = (user as { role?: string }).role ?? Role.USER;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? Role.USER;
      }
      return session;
    },
  },
});
