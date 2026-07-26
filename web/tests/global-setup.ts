import { execSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";

// Отдельная тестовая PostgreSQL-база — НЕ рабочая mydebate, иначе прогон
// тестов затирал бы демо-данные. Держите в синхронизации с tests/setup.ts;
// переопределяется через TEST_DATABASE_URL (напр. в CI).
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://temirlanraiymbek@localhost:5432/mydebate_test?schema=public";

/**
 * Тесты работают со СВОЕЙ базой (mydebate_test). Перед прогоном схема
 * очищается и приводится к schema.prisma, поэтому состояние всегда
 * предсказуемо. Требуется запущенный PostgreSQL (Postgres.app) — как и само
 * приложение.
 *
 * Сброс делаем прямым `DROP SCHEMA public CASCADE` через pg, а НЕ
 * `prisma db push --force-reset`: деструктивные команды Prisma Migrate
 * защищены отдельным подтверждением, а тут заведомо одноразовая тестовая
 * база. После сброса обычный `db push` (без флагов) создаёт таблицы заново.
 */
export default async function setup() {
  const client = new Client({ connectionString: TEST_DATABASE_URL });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  } finally {
    await client.end();
  }

  // `--schema=` обязателен: без него Prisma 7 CLI не находит схему в этом проекте.
  execSync("npx prisma db push --schema=prisma/schema.prisma --accept-data-loss", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "ignore",
  });
}
