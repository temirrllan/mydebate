// Расширение типов NextAuth (Auth.js v5): добавляем `id` и `role` в
// Session.user, JWT и User — заполняются в колбэках `jwt`/`session` в
// `auth.ts`. Единственный источник правды для роли — `Role` из
// `@/lib/enums.ts` (строковые значения USER | ORGANIZER | ADMIN).
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
