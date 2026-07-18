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
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    // Кастомная страница логина — чтобы NextAuth не редиректил на свою
    // дефолтную /api/auth/signin при отсутствии сессии.
    signIn: "/login",
  },
  providers: [
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
    async jwt({ token, user }) {
      // `user` присутствует только сразу после успешного signIn.
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? Role.USER;
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
