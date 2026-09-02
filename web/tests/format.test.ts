import { describe, expect, it } from "vitest";

import { formatDate, formatDateShort, formatDateTime, formatPriceValue } from "@/lib/format";

// Дата турнира лежит в базе как UTC-полночь (приходит из <input type="date">).
const DATE = new Date(Date.UTC(2026, 11, 30));

describe("форматирование дат", () => {
  it("показывает месяц на языке интерфейса", () => {
    expect(formatDate(DATE, "ru")).toContain("декабря");
    expect(formatDate(DATE, "en")).toContain("December");
    expect(formatDate(DATE, "kk")).toContain("желтоқсан");
  });

  // Chrome заявляет поддержку kk-KZ, но данных по казахскому в его ICU нет —
  // вместо названия месяца он печатает «M12». В Node ICU полный, поэтому
  // одна и та же дата выглядела по-разному в серверных и клиентских
  // компонентах. Казахские месяцы берутся из своей таблицы (см. lib/format.ts),
  // и этот тест следит, чтобы её не выбросили обратно в пользу Intl.
  it("не отдаёт казахскую дату на откуп Intl", () => {
    expect(formatDate(DATE, "kk")).not.toMatch(/M\d/);
    expect(formatDateShort(DATE, "kk")).not.toMatch(/M\d/);
    expect(formatDateTime(DATE, "kk")).not.toMatch(/M\d/);
  });

  it("не сдвигает дату из-за часового пояса сервера", () => {
    // Без timeZone: "UTC" на сервере западнее Гринвича 30 декабря
    // показывалось бы как 29-е.
    for (const locale of ["ru", "kk", "en"]) {
      expect(formatDate(DATE, locale)).toContain("30");
    }
  });

  it("короткая дата короче полной", () => {
    for (const locale of ["ru", "kk", "en"]) {
      expect(formatDateShort(DATE, locale).length).toBeLessThanOrEqual(
        formatDate(DATE, locale).length,
      );
    }
  });
});

describe("форматирование цены", () => {
  it("разделяет разряды по правилам локали", () => {
    for (const locale of ["ru", "kk", "en"]) {
      const value = formatPriceValue(50000, locale);
      expect(value).toContain("₸");
      // 50000 без разделителя — признак того, что локаль не применилась.
      expect(value).not.toContain("50000");
    }
  });
});
