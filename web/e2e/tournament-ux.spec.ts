import { test, expect, type Page } from "@playwright/test";

// Демо-аккаунты из prisma/seed.ts. Как и в auth-and-access.spec.ts, тесты
// только читают и логинятся — ничего не создают и не отправляют, поэтому
// демо-базу после прогона пересеивать не нужно. Рассылку здесь НЕ отправляем
// (это письма реальным адресам из демо-данных) — проверяем только форму.
const USER = { email: "sanzhar@mydebate.kz", password: "password123" };
const ORGANIZER = { email: "organizer@mydebate.kz", password: "password123" };

async function login(page: Page, { email, password }: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Пароль" }).fill(password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/**
 * Путь к MUN-турниру, у которого организатор действительно завёл комитеты
 * (разделы). Не всякий MUN в демо-данных их имеет, а без них форма поле
 * выбора комитета не показывает — это её штатное поведение, а не поломка.
 */
async function findMunTournamentWithCommittees(page: Page): Promise<string | null> {
  await page.goto("/tournaments?format=MUN");
  const hrefs = await page
    .locator("h3 a")
    .evaluateAll((els) => els.map((el) => (el as HTMLAnchorElement).getAttribute("href")!));

  for (const href of hrefs) {
    await page.goto(href);
    if (await page.getByRole("heading", { name: "Комитеты" }).isVisible()) return href;
  }
  return null;
}

test.describe("каталог", () => {
  test("карточка турнира кликабельна целиком", async ({ page }) => {
    await page.goto("/tournaments");

    // Кликаем по обложке, а не по кнопке «Подробнее»: ради этого ссылка и
    // растянута на всю карточку.
    const card = page.locator("h3 a").first();
    const title = (await card.textContent())?.trim();
    await card.click();

    await expect(page).toHaveURL(/\/tournaments\/[^/]+$/);
    await expect(page.getByRole("heading", { level: 1, name: title! })).toBeVisible();
  });

  test("турниры с прошедшим дедлайном регистрации не показываются", async ({ page }) => {
    await page.goto("/tournaments");

    // Каталог — витрина событий, на которые ещё можно подать заявку.
    const closed = page.getByText("Регистрация завершена");
    await expect(closed).toHaveCount(0);
  });
});

test.describe("регистрация на MUN", () => {
  test("комитеты показаны с описанием и выбираются радиокнопкой", async ({ page }) => {
    await login(page, USER);
    const path = await findMunTournamentWithCommittees(page);

    // Даты в prisma/seed.ts абсолютные и со временем устаревают: если ни у
    // одного MUN с комитетами не открыта регистрация, проверять нечего —
    // пропускаем тест, а не роняем его (данные, а не код). Лечится
    // пересевом демо-базы со свежими датами.
    test.skip(path === null, "В демо-данных нет MUN с комитетами и открытой регистрацией");

    await page.goto(`${path}/register`);

    const group = page.getByRole("group", { name: /Предпочитаемый комитет/ });
    await expect(group).toBeVisible();

    // Название комитета И описание, которое написал организатор, — то, чего
    // не хватало в прежнем <select> с одними заголовками.
    await expect(group.getByText("UNHRC")).toBeVisible();
    await expect(group.getByText("Совет по правам человека ООН.")).toBeVisible();

    const first = group.getByRole("radio").first();
    await first.check();
    await expect(first).toBeChecked();
  });
});

test.describe("организатор", () => {
  test("видит форму рассылки участникам с шаблонами", async ({ page }) => {
    await login(page, ORGANIZER);

    await page.goto("/profile?tab=tournaments");
    await page.getByRole("link", { name: /Участники/ }).first().click();
    await page.waitForURL(/\/participants$/);

    const toggle = page.getByRole("button", { name: /Написать участникам/ });
    await expect(toggle).toBeVisible();
    await toggle.click();

    await expect(page.getByRole("textbox", { name: /Тема/ })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Сообщение/ })).toBeVisible();

    // Шаблон заполняет тему и каркас текста — ради этого он и нужен.
    await page.getByRole("button", { name: "Чат турнира" }).click();
    await expect(page.getByRole("textbox", { name: /Тема/ })).toHaveValue(
      "Присоединяйтесь к чату турнира",
    );
    await expect(page.getByRole("textbox", { name: /Сообщение/ })).toContainText(
      "WhatsApp",
    );
  });
});
