import { test, expect, type Page } from "@playwright/test";

// Демо-аккаунты из prisma/seed.ts. Тесты только читают данные — ничего не
// создают и не удаляют, поэтому демо-базу можно не пересеивать после прогона.
const USER = { email: "sanzhar@mydebate.kz", password: "password123" };
const ADMIN = { email: "admin@mydebate.kz", password: "password123" };

async function login(page: Page, { email, password }: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Пароль" }).fill(password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

test.describe("гость", () => {
  // Каталог и страницы турниров открыты гостю намеренно: поисковый робот
  // приходит как гость, и при закрытом каталоге сайт не индексировался вовсе
  // (см. proxy.ts). Вход требуется на действиях — они проверяются ниже.
  test("видит каталог турниров", async ({ page }) => {
    await page.goto("/tournaments");

    await expect(page).toHaveURL(/\/tournaments/);
    await expect(page.getByRole("heading", { name: "Все турниры" })).toBeVisible();
  });

  test("открывает страницу турнира, но регистрация уводит на вход", async ({ page }) => {
    await page.goto("/tournaments");
    // Кликаем по заголовку карточки: он и есть ссылка, растянутая на всю
    // карточку (см. TournamentCard). Дублирующая кнопка «Подробнее» скрыта от
    // скринридера и от Playwright — ровно одна ссылка на турнир в карточке.
    const firstCard = page.locator("h3 a").first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/tournaments\/[^/]+$/);

    const tournamentUrl = new URL(page.url());
    await page.goto(`${tournamentUrl.pathname}/register`);
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
    await expect(page.getByRole("heading", { name: "Вход в аккаунт" })).toBeVisible();
  });

  test("не может создать турнир — его уводит на вход", async ({ page }) => {
    await page.goto("/tournaments/create");

    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Ftournaments%2Fcreate/);
    await expect(page.getByRole("heading", { name: "Вход в аккаунт" })).toBeVisible();
  });

  test("не видит профиль и админку", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("видит лендинг", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Смотреть турниры" }).first()).toBeVisible();
  });

  test("не входит с неверным паролем и не узнаёт, существует ли аккаунт", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email" }).fill(USER.email);
    await page.getByRole("textbox", { name: "Пароль" }).fill("неверный-пароль");
    await page.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(page.getByText("Неверный Email или пароль.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("пользователь", () => {
  test("входит и попадает туда, куда шёл (callbackUrl)", async ({ page }) => {
    // Каталог гостю теперь открыт, поэтому проверяем callbackUrl на
    // защищённом маршруте — создании турнира.
    await page.goto("/tournaments/create");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Ftournaments%2Fcreate/);

    await page.getByRole("textbox", { name: "Email" }).fill(USER.email);
    await page.getByRole("textbox", { name: "Пароль" }).fill(USER.password);
    await page.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(page).toHaveURL(/\/tournaments\/create/);
    await expect(page.getByRole("heading", { name: "Создание турнира" })).toBeVisible();
  });

  test("не попадает в админку — видит «Доступ запрещён»", async ({ page }) => {
    await login(page, USER);

    await page.goto("/admin");

    await expect(page).toHaveURL(/\/403/);
    await expect(page.getByRole("heading", { name: "Доступ запрещён" })).toBeVisible();
  });

  test("видит свой профиль с заявками", async ({ page }) => {
    await login(page, USER);

    await page.goto("/profile?tab=applications");

    await expect(page.getByRole("heading", { name: "Мои заявки" })).toBeVisible();
  });
});

test.describe("админ", () => {
  test("видит очередь модерации", async ({ page }) => {
    await login(page, ADMIN);

    await page.goto("/admin/moderation");

    await expect(page.getByRole("heading", { name: "Модерация турниров" })).toBeVisible();
    // Кнопки решения по заявке — то, ради чего страница существует.
    await expect(page.getByRole("button", { name: "Одобрить" }).first()).toBeVisible();
  });

  test("видит дашборд со сводкой", async ({ page }) => {
    await login(page, ADMIN);

    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: "Админ-панель" })).toBeVisible();
    await expect(page.getByText("Турниров ждёт модерации")).toBeVisible();
  });
});
