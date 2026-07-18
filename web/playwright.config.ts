import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * Браузерные (e2e) тесты. В отличие от vitest-тестов, они гоняют НАСТОЯЩЕЕ
 * приложение: Playwright сам поднимает dev-сервер на отдельном порту (3100,
 * чтобы не конфликтовать с вашим `npm run dev` на 3000) и ходит по нему
 * Chromium'ом.
 *
 * База — обычная dev.db с демо-данными: e2e-сценарии здесь ТОЛЬКО читают и
 * логинятся, ничего не создавая и не удаляя, поэтому демо-состояние не портится.
 * Всё, что мутирует данные, покрыто vitest-тестами на отдельной test.db.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      AUTH_URL: `http://localhost:${PORT}`,
      NEXTAUTH_URL: `http://localhost:${PORT}`,
    },
  },
});
