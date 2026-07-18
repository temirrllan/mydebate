import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const TEST_DB_FILE = path.resolve(__dirname, "../test.db");

/**
 * Тесты работают со СВОЕЙ базой (`web/test.db`), а не с dev.db — иначе прогон
 * тестов затирал бы демо-данные. Перед прогоном база пересоздаётся с нуля из
 * schema.prisma (`prisma db push`), поэтому её состояние всегда предсказуемо.
 */
export default function setup() {
  if (existsSync(TEST_DB_FILE)) unlinkSync(TEST_DB_FILE);

  // `--schema=` обязателен: без него Prisma 7 CLI не находит схему в этом проекте.
  execSync("npx prisma db push --schema=prisma/schema.prisma --accept-data-loss", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "ignore",
  });
}
