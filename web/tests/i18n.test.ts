import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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
        "filters.format", // «Формат» — заимствование, в казахском так же
        "tournament.format",
        "registration.asideFormat", // «Формат: …» — то же слово
        "profile.metaTitle", // «Профиль» — заимствование
        "profile.tabOverview",
        "profile.phone", // «Телефон»
        "profile.cityPlaceholder", // «Астана» — имя собственное
        // MUN и уровни (Beginner/Intermediate/Advanced) — устоявшиеся термины
        // дебатного сообщества, их не переводят ни на один из трёх языков.
        "enums.format.MUN",
        "enums.level.BEGINNER",
        "enums.level.INTERMEDIATE",
        "enums.level.ADVANCED",
        "enums.locationType.ONLINE", // «Онлайн» / «Офлайн» — те же слова
        "enums.locationType.OFFLINE",
        "auth.emailLabel", // «Email» — так и пишется на всех трёх языках
      ];

      const untranslated = ruKeys.filter(
        (key) =>
          !ALLOWED_SAME.includes(key) && get(ru, key) === get(CATALOGUES[locale], key),
      );

      expect(untranslated).toEqual([]);
    });
  }
});

// Схемы валидации хранят КЛЮЧ сообщения, а не текст (lib/validations/*.ts).
// Ключ, которого нет в словаре, ничего не ломает при сборке — он просто
// доезжает до пользователя как есть: в поле появляется «titleRequired».
// Единственный способ это поймать — сверить схемы со словарём.
describe("ключи сообщений валидации", () => {
  const VALIDATIONS_DIR = join(__dirname, "..", "lib", "validations");

  /** Все значения error:/message: из zod-схем. */
  function keysUsedInSchemas(): { file: string; key: string }[] {
    const found: { file: string; key: string }[] = [];
    for (const file of readdirSync(VALIDATIONS_DIR).filter((f) => f.endsWith(".ts"))) {
      const source = readFileSync(join(VALIDATIONS_DIR, file), "utf8");
      for (const m of source.matchAll(/(?:error|message):\s*"([^"]+)"/g)) {
        found.push({ file, key: m[1] });
      }
    }
    return found;
  }

  it("схемы не содержат готового текста — только ключи", () => {
    // Кириллица в схеме означает, что сообщение забыли вынести в словарь.
    const withText = keysUsedInSchemas().filter(({ key }) => /[А-Яа-яЁё]/.test(key));
    expect(withText).toEqual([]);
  });

  for (const locale of LOCALES) {
    it(`${locale}: каждый ключ из схем есть в словаре`, () => {
      const catalogue = (CATALOGUES[locale] as { validation?: Record<string, string> })
        .validation;

      const orphans = keysUsedInSchemas()
        .filter(({ key }) => !catalogue?.[key])
        .map(({ file, key }) => `${file}: ${key}`);

      expect(orphans).toEqual([]);
    });
  }
});
