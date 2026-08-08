// Проверка whitelist'а ссылок на изображения турнира (step2Schema,
// lib/validations/tournament.ts).
//
// Зачем отдельный тест: coverImage/logoImage приходят из formData, то есть
// подделываются POST'ом в обход формы, а затем подставляются в next/image.
// Чужой хост там — это не «некрасивая картинка», а исключение при рендере,
// то есть падение страницы турнира и каталога для всех посетителей. Значит
// граница должна быть покрыта тестом, а не только комментарием.
import { describe, expect, it } from "vitest";

import { step2Schema } from "@/lib/validations/tournament";

/** Описание валидно само по себе (min 50 символов) — проверяем только ссылки. */
const VALID_DESCRIPTION = "О".repeat(60);

function parseCover(coverImage: string) {
  return step2Schema.safeParse({ description: VALID_DESCRIPTION, coverImage });
}

describe("step2Schema: ссылки на изображения", () => {
  it("принимает пустую строку — картинка необязательна", () => {
    expect(parseCover("").success).toBe(true);
  });

  it("принимает локальный путь загрузчика", () => {
    expect(parseCover("/uploads/tournaments/3f8a1c2e-0b4d-4a11-9c77-2e5b6d1f0a93.jpg").success).toBe(
      true,
    );
  });

  it("принимает URL Vercel Blob", () => {
    const url =
      "https://abc123xyz.public.blob.vercel-storage.com/tournaments/3f8a1c2e-0b4d-4a11-9c77-2e5b6d1f0a93.png";
    expect(parseCover(url).success).toBe(true);
  });

  it.each([
    ["чужой хост", "https://evil.example.com/pwn.jpg"],
    ["javascript-схема", "javascript:alert(1)"],
    ["data-URI", "data:image/svg+xml;base64,PHN2Zy8+"],
    ["выход из каталога загрузок", "/uploads/tournaments/../../../.env"],
    ["протокол http вместо https у Blob", "http://abc.public.blob.vercel-storage.com/x.jpg"],
    ["хост, лишь похожий на Blob", "https://public.blob.vercel-storage.com.evil.com/x.jpg"],
  ])("отклоняет %s", (_name, value) => {
    expect(parseCover(value).success).toBe(false);
  });

  it("отклоняет ссылку длиннее 500 символов", () => {
    expect(parseCover(`/uploads/tournaments/${"a".repeat(500)}.jpg`).success).toBe(false);
  });
});
