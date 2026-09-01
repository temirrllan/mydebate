import { test, expect } from "@playwright/test";

// Локализация проверяется в браузере, а не юнит-тестом: почти всё, что тут
// может сломаться, — это связка прокси + маршрутов + словаря, а она
// существует только на живом запросе.
test.describe("три языка", () => {
  test("русский остаётся без префикса, остальные — с префиксом", async ({ page }) => {
    // Прежние адреса не должны стать редиректами: сайт по ним уже
    // проиндексирован (см. localePrefix в i18n/routing.ts).
    await page.goto("/tournaments");
    await expect(page).toHaveURL(/\/tournaments$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Все турниры");

    await page.goto("/kk/tournaments");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Барлық турнирлер");

    await page.goto("/en/tournaments");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("All tournaments");
  });

  test("атрибут lang меняется вместе с локалью", async ({ page }) => {
    // Без него скринридер читает казахский текст русскими правилами, а
    // браузер предлагает «перевести страницу» с неверного языка.
    for (const [path, lang] of [
      ["/", "ru"],
      ["/kk", "kk"],
      ["/en", "en"],
    ] as const) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
    }
  });

  test("переключатель ведёт на ту же страницу на другом языке", async ({ page }) => {
    await page.goto("/tournaments");

    await page.getByRole("group", { name: "Язык интерфейса" }).getByText("ҚАЗ").click();

    await expect(page).toHaveURL(/\/kk\/tournaments$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Барлық турнирлер");
  });

  test("переключатель сохраняет фильтры каталога", async ({ page }) => {
    // Смена языка не должна сбрасывать подобранную выдачу к списку с нуля.
    await page.goto("/tournaments?format=MUN");

    await page.getByRole("group", { name: "Язык интерфейса" }).getByText("EN").click();

    await expect(page).toHaveURL(/\/en\/tournaments\?format=MUN$/);
  });

  test("гостя со страницы на казахском разворачивает на казахский вход", async ({ page }) => {
    // Иначе после входа человек возвращается на русскую версию страницы.
    await page.goto("/kk/profile");

    await expect(page).toHaveURL("/kk/login?callbackUrl=%2Fkk%2Fprofile");
  });

  // Регресс, который однажды уже случился: next-intl переписывает каждый
  // дошедший до него путь в /[locale]/..., и /sitemap.xml превращался в
  // /ru/sitemap.xml → 404. Молча: сайт работает, а карта сайта у поисковика
  // пропала. Ловится только таким тестом.
  test("служебные файлы не уезжают под префикс локали", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("<urlset");

    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    // Закрытые разделы должны быть закрыты на всех языках, а не только на русском.
    const body = await robots.text();
    expect(body).toContain("Disallow: /profile");
    expect(body).toContain("Disallow: /kk/profile");
    expect(body).toContain("Disallow: /en/profile");
  });

  test("страница объявляет свои версии на других языках (hreflang)", async ({ page }) => {
    await page.goto("/");

    const alternates = page.locator('link[rel="alternate"][hreflang]');
    await expect(alternates).toHaveCount(4); // ru, kk, en + x-default
    await expect(page.locator('link[hreflang="kk"]')).toHaveAttribute("href", /\/kk$/);
  });
});
