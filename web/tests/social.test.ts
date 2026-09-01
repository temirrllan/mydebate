import { describe, expect, it } from "vitest";

import { normalizeSocialUrl } from "@/lib/social";

// Соцсети организатор вводит текстом («@mydebate», «instagram.com/mydebate»),
// а в href нужен абсолютный адрес — иначе браузер открывает путь внутри
// сайта и показывает 404 вместо профиля.
describe("normalizeSocialUrl", () => {
  it("превращает ник в ссылку на профиль", () => {
    expect(normalizeSocialUrl("@mydebate", "instagram")).toBe("https://www.instagram.com/mydebate");
    expect(normalizeSocialUrl("mydebate", "instagram")).toBe("https://www.instagram.com/mydebate");
    expect(normalizeSocialUrl("@mydebate_kz", "telegram")).toBe("https://t.me/mydebate_kz");
    expect(normalizeSocialUrl("@mydebate", "tiktok")).toBe("https://www.tiktok.com/@mydebate");
  });

  it("дописывает протокол к домену без него", () => {
    expect(normalizeSocialUrl("instagram.com/mydebate", "instagram")).toBe(
      "https://instagram.com/mydebate",
    );
    expect(normalizeSocialUrl("www.tiktok.com/@mydebate", "tiktok")).toBe(
      "https://www.tiktok.com/@mydebate",
    );
    expect(normalizeSocialUrl("t.me/mydebate_kz", "telegram")).toBe("https://t.me/mydebate_kz");
  });

  it("оставляет готовую ссылку как есть", () => {
    expect(normalizeSocialUrl("https://www.instagram.com/mydebate/", "instagram")).toBe(
      "https://www.instagram.com/mydebate/",
    );
  });

  it("не пропускает опасные и пустые значения", () => {
    // href со «javascript:» на публичной странице турнира — XSS.
    expect(normalizeSocialUrl("javascript:alert(1)", "instagram")).toBeNull();
    expect(normalizeSocialUrl("  ", "instagram")).toBeNull();
    expect(normalizeSocialUrl(null, "instagram")).toBeNull();
    expect(normalizeSocialUrl("не ссылка и не ник", "instagram")).toBeNull();
  });
});
