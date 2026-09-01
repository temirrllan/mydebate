import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Регресс, из-за которого главная на проде ушла в бесконечный редирект.
//
// next-intl отвечает внутренним rewrite ("/" → "/ru") и строит его адрес из
// origin переданного запроса. NextAuth внутри обёртки auth() подменяет origin
// на AUTH_URL, то есть на ПУБЛИЧНЫЙ домен. Если отдать next-intl запрос из-под
// обёртки, Next видит rewrite на чужой origin, считает его внешним и
// превращает в редирект — "/" → "/" по кругу.
//
// Локально этого не видно: там публичный и внутренний origin совпадают.
// Ломается только за обратным прокси — то есть сразу на проде. Поэтому
// проверяем инвариант напрямую: next-intl обязан получить ИСХОДНЫЙ запрос.

const INTERNAL_ORIGIN = "http://internal.local:3000";
const PUBLIC_ORIGIN = "https://mydebate.kz";

// Параметр объявлен явно: без него vi.fn выводит тип «функция без
// аргументов», и mock.calls[0][0] не проходит проверку типов.
const handleI18n = vi.fn((req: NextRequest) => {
  void req;
  return NextResponse.next();
});

vi.mock("next-intl/middleware", () => ({
  default: () => handleI18n,
}));

vi.mock("@/auth", () => ({
  // Повторяем поведение настоящего NextAuth: обработчик получает запрос с
  // подменённым origin. Без этой подмены тест был бы зелёным и при
  // возвращённом баге.
  auth: (handler: (req: NextRequest) => unknown) => async (req: NextRequest) => {
    const normalized = new NextRequest(
      new URL(req.nextUrl.pathname + req.nextUrl.search, PUBLIC_ORIGIN),
    );
    return handler(Object.assign(normalized, { auth: null }));
  },
}));

const { default: proxy } = await import("@/proxy");

describe("прокси: локали и авторизация", () => {
  beforeEach(() => {
    handleI18n.mockClear();
  });

  // Оба пути: "/" выходит из проверок сразу (он в PUBLIC_PATHS), "/tournaments"
  // проходит их целиком. Проверяем оба — баг жил именно во второй ветке, и
  // тест только на "/" пропустил бы его.
  it.each(["/", "/tournaments"])(
    "отдаёт next-intl исходный запрос (%s), а не подменённый обёрткой auth()",
    async (path) => {
      await proxy(new NextRequest(`${INTERNAL_ORIGIN}${path}`), {} as never);

      // Ровно один вызов: лишний — признак того, что next-intl зовут ещё и
      // изнутри auth(), с подменённым origin.
      expect(handleI18n).toHaveBeenCalledTimes(1);
      const received = handleI18n.mock.calls[0][0];

      // Именно это и сломалось: сюда прилетал PUBLIC_ORIGIN.
      expect(received.nextUrl.origin).toBe(INTERNAL_ORIGIN);
    },
  );

  it("разворачивает гостя на вход, сохраняя локаль страницы", async () => {
    const res = await proxy(new NextRequest(`${INTERNAL_ORIGIN}/kk/profile`), {} as never);

    // Редирект строится из публичного origin — его видит браузер, это верно.
    expect(res.headers.get("location")).toBe(
      `${PUBLIC_ORIGIN}/kk/login?callbackUrl=%2Fkk%2Fprofile`,
    );
    // До next-intl дело не дошло: ответ уже сформирован.
    expect(handleI18n).not.toHaveBeenCalled();
  });

  it("у локали по умолчанию адрес возврата остаётся без префикса", async () => {
    const res = await proxy(new NextRequest(`${INTERNAL_ORIGIN}/profile`), {} as never);

    expect(res.headers.get("location")).toBe(
      `${PUBLIC_ORIGIN}/login?callbackUrl=%2Fprofile`,
    );
  });
});
