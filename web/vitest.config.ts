import path from "node:path";
import { defineConfig } from "vitest/config";

// Тесты серверной логики (Server Actions + запросы Prisma) гоняются в node, без
// Next.js. Два обхода, без которых модули приложения не импортируются:
//
// 1. `server-only` — пакет-страж, который по умолчанию бросает ошибку при
//    импорте вне серверного окружения Next. В vitest его подменяем на пустышку.
// 2. `@/generated/prisma/client` резолвится через tsconfig paths — здесь тот же
//    алиас задан вручную, чтобы не тянуть vite-tsconfig-paths в node-окружение.
export default defineConfig({
  resolve: {
    alias: {
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["tests/global-setup.ts"],
    include: ["tests/**/*.test.ts"],
    // Тесты делят одну SQLite-базу, поэтому файлы гоняем последовательно:
    // параллельные прогоны затирали бы фикстуры друг друга.
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
