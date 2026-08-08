// Route Handler загрузки обложки/логотипа турнира (Этап 5, spec §7 "Create
// tournament ... Step 2: cover + logo").
//
// Реализовано как Route Handler, а НЕ Server Action: Server Actions в этой
// версии Next.js по умолчанию ограничивают тело запроса 1 МБ
// (serverActions.bodySizeLimit, node_modules/next/dist/docs/.../server-actions.md),
// а задание требует принимать изображения до 5 МБ — Route Handler такого
// встроенного лимита не имеет.
//
// Авторизация: не является UI-страницей, поэтому НЕ добавлен в
// AUTH_REQUIRED_PREFIXES прокси (web/proxy.ts) — редирект на /login для
// fetch-запроса из клиентского кода был бы некорректным поведением (клиент
// получил бы HTML-редирект вместо JSON). Вместо этого сам обработчик
// проверяет сессию через getCurrentUser() и возвращает 401 (по аналогии с
// рекомендацией в lib/auth/session.ts: "для Route Handlers используйте
// getCurrentUser() напрямую и возвращайте Response с нужным статусом сами").
//
// Контракт: POST multipart/form-data с полем "file" -> 200 { url: string }.
// Ошибка -> { error: string } с соответствующим HTTP-статусом; тексты
// ошибок пользователе-безопасны (spec §11).
//
// Куда пишем файл — зависит от окружения:
//   * задан BLOB_READ_WRITE_TOKEN -> Vercel Blob, возвращаем абсолютный URL
//     вида https://<store>.public.blob.vercel-storage.com/tournaments/<uuid>.jpg;
//   * токена нет (локальная разработка, self-hosted с диском) -> пишем в
//     public/uploads/tournaments и возвращаем относительный путь.
// Причина: на Vercel файловая система инстанса доступна только на чтение
// (кроме /tmp) и живёт до конца запроса, так что записанная обложка
// потерялась бы. Оба варианта отдают URL, который переваривает next/image —
// хост Blob разрешён в next.config.ts (remotePatterns), а относительный путь
// проверок не требует. Допустимые формы URL продублированы в
// lib/validations/tournament.ts (imageUrlSchema) — держите в синхронизации.
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 МБ

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** MIME-тип по расширению, определённому из сигнатуры файла (см. detectImageExtension). */
const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "tournaments");

/**
 * Тип файла определяем по сигнатуре его содержимого, а не по `file.type`:
 * MIME-тип приходит из multipart-заголовка клиента и подделывается тривиально,
 * так что на него нельзя опираться (spec §11 — валидация на границе).
 * Расширение сохраняемого файла берём отсюда же, поэтому под видом .png не
 * окажется произвольное содержимое.
 */
function detectImageExtension(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Необходимо войти в систему." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан." }, { status: 400 });
  }

  // Заявленный клиентом MIME-тип — только для быстрого отказа: настоящая
  // проверка ниже, по сигнатуре содержимого.
  if (!ALLOWED_TYPES[file.type]) {
    return NextResponse.json(
      { error: "Допустимые форматы изображений: JPEG, PNG, WebP." },
      { status: 400 },
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Размер файла не должен превышать 5 МБ." }, { status: 400 });
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(await file.arrayBuffer());
  } catch (error) {
    console.error("[uploads] Не удалось прочитать файл:", error);
    return NextResponse.json({ error: "Что-то пошло не так. Попробуйте позже." }, { status: 500 });
  }

  const extension = detectImageExtension(bytes);
  if (!extension) {
    return NextResponse.json(
      { error: "Файл не является изображением JPEG, PNG или WebP." },
      { status: 400 },
    );
  }

  const filename = `${randomUUID()}.${extension}`;

  let url: string;
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // addRandomSuffix по умолчанию false, а имя у нас и так уникальное (uuid),
      // поэтому путь в хранилище совпадает с тем, что мы попросили.
      const blob = await put(`tournaments/${filename}`, bytes, {
        access: "public",
        contentType: CONTENT_TYPE_BY_EXTENSION[extension],
      });
      url = blob.url;
    } else {
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(path.join(UPLOAD_DIR, filename), bytes);
      url = `/uploads/tournaments/${filename}`;
    }
  } catch (error) {
    console.error("[uploads] Не удалось сохранить файл:", error);
    return NextResponse.json({ error: "Что-то пошло не так. Попробуйте позже." }, { status: 500 });
  }

  console.log(`[uploads] user=${user.id} загрузил изображение турнира: ${filename}`);

  return NextResponse.json({ url });
}
