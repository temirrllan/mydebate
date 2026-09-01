import { describe, expect, it } from "vitest";

import { LOCALES } from "@/i18n/routing";
import en from "@/messages/en.json";
import kk from "@/messages/kk.json";
import ru from "@/messages/ru.json";

// Русский — источник правды: строки сначала появляются в нём, потом
// переводятся. Тест ловит самое частое, что случается с тремя словарями:
// ключ добавили в один файл и забыли в двух других. В интерфейсе это
// всплывает не ошибкой сборки, а сырым ключом «home.ctaTitle» на живой
// странице у казахоязычного пользователя.
const CATALOGUES: Record<string, unknown> = { ru, kk, en };

/** Плоский список путей до всех строк словаря: ["nav.home", "home.steps.choose", …]. */
function flatten(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

/** Плейсхолдеры вида {count}, {year} — в переводе должны быть те же. */
function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();
}

function get(catalogue: unknown, path: string): string | undefined {
  const value = path
    .split(".")
    .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], catalogue);
  return typeof value === "string" ? value : undefined;
}

describe("словари переводов", () => {
  const ruKeys = flatten(ru).sort();

  it("описывают все объявленные локали", () => {
    expect(Object.keys(CATALOGUES).sort()).toEqual([...LOCALES].sort());
  });

  for (const locale of LOCALES) {
    if (locale === "ru") continue;

    it(`${locale}: набор ключей совпадает с русским`, () => {
      const keys = flatten(CATALOGUES[locale]).sort();

      expect(keys.filter((k) => !ruKeys.includes(k))).toEqual([]); // лишние
      expect(ruKeys.filter((k) => !keys.includes(k))).toEqual([]); // недостающие
    });

    it(`${locale}: плейсхолдеры не потеряны при переводе`, () => {
      // «© {year} MyDebate» без {year} не сломает сборку, но на странице
      // появится год-заглушка — такое ловится только глазами.
      const broken = ruKeys.filter((key) => {
        const source = get(ru, key);
        const translated = get(CATALOGUES[locale], key);
        if (!source || !translated) return false;
        return placeholders(source).join() !== placeholders(translated).join();
      });

      expect(broken).toEqual([]);
    });

    it(`${locale}: нет строк, оставшихся без перевода`, () => {
      // Совпадение с русским — почти наверняка забытая строка. Но часть слов
      // совпадает законно: это заимствования, которые в казахском пишутся так
      // же. Каждое исключение добавляется сюда осознанно, после проверки, —
      // иначе смысл проверки теряется.
      const ALLOWED_SAME = [
        "footer.instagramLabel", // названия сетей не переводятся
        "footer.telegramLabel",
        "common.online", // «Онлайн» — то же слово в казахском
        "footer.navTitle", // «Навигация»
        "nav.profile", // «Профиль»
      ];

      const untranslated = ruKeys.filter(
        (key) =>
          !ALLOWED_SAME.includes(key) && get(ru, key) === get(CATALOGUES[locale], key),
      );

      expect(untranslated).toEqual([]);
    });
  }
});
