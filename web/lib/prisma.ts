// Prisma 7's "prisma-client" generator does not emit an index/package.json for
// the output directory, so the generated `client.ts` must be imported by its
// explicit path (its own header comment confirms "you can import this file
// directly"). A bare `@/generated/prisma` import fails to resolve.
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Our schema.prisma datasource has no `url = env(...)` (the URL lives in
// prisma.config.ts for CLI commands only — see prisma/schema.prisma header
// comment). At runtime the generated client therefore requires an explicit
// driver adapter; PrismaClientOptions has no plain `datasourceUrl` fallback
// in Prisma 7. PrismaPg opens a `pg` connection pool from the standard
// PostgreSQL connection string in DATABASE_URL
// (postgresql://user@host:5432/db).
function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — check your .env file.");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
  });
}

// Singleton Prisma-клиента: в dev-режиме Next.js пересобирает модули при
// каждом изменении файла (HMR), из-за чего наивный `new PrismaClient()` в
// модульной области видимости плодил бы новые подключения к БД на каждый
// hot-reload. Кэшируем экземпляр на globalThis, чтобы переиспользовать его
// между перезагрузками модуля в dev; в production глобальный кэш не нужен.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
