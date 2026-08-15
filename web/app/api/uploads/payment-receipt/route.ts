// Route Handler загрузки чека об оплате взноса (макет
// `maket/Регистрация на турнир 1.png`, блок «3. Подтверждение оплаты»).
//
// Отдельный обработчик, а не общий с обложками турниров: у чека другие
// правила — принимаем ещё и PDF (банки отдают квитанции именно так) и лимит
// 10 МБ вместо 5, как указано в макете. Смешивать это в одном маршруте
// значило бы ослабить проверки для обложек.
//
// Контракт: POST multipart/form-data с полем "file" -> 200 { url: string }.
// Ошибка -> { error: string }; тексты пользователе-безопасны (spec §11).
//
// ВАЖНО про приватность: на чеке видны имя плательщика и сумма, поэтому файл
// НЕ отдаётся всем подряд по ссылке, как обложки. Читать его может только
// автор заявки, организатор турнира и админ — см.
// app/uploads/receipts/[filename]/route.ts.
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 МБ — как в макете

// ВНЕ public/ — принципиально. Next составляет список файлов public/ при
// СТАРТЕ сервера и всё, что там лежит, отдаёт статикой напрямую, минуя
// маршруты. Чек, загруженный сегодня, после ближайшего перезапуска стал бы
// публично скачиваемым по прямой ссылке в обход проверки прав. Поэтому файлы
// лежат в data/receipts, куда статика Next не заглядывает, и единственный
// способ их получить — app/uploads/receipts/[filename]/route.ts.
//
// Публичный URL при этом остаётся прежним («/uploads/receipts/<файл>») — он
// обслуживается маршрутом и с расположением на диске не связан.
const UPLOAD_DIR = path.join(process.cwd(), "data", "receipts");

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

/**
 * Тип определяем по сигнатуре содержимого, а не по заявленному клиентом
 * MIME-типу: последний берётся из заголовка multipart и подделывается
 * тривиально. Расширение сохраняемого файла берём отсюда же, поэтому под
 * видом .pdf не окажется произвольное содержимое.
 */
function detectExtension(bytes: Buffer): string | null {
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
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  // PDF всегда начинается с "%PDF-"
  if (bytes.length >= 5 && bytes.toString("ascii", 0, 5) === "%PDF-") return "pdf";
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

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Размер файла не должен превышать 10 МБ." }, { status: 400 });
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(await file.arrayBuffer());
  } catch (error) {
    console.error("[uploads] Не удалось прочитать чек:", error);
    return NextResponse.json({ error: "Что-то пошло не так. Попробуйте позже." }, { status: 500 });
  }

  const extension = detectExtension(bytes);
  if (!extension) {
    return NextResponse.json(
      { error: "Допустимые форматы чека: JPG, PNG, WebP или PDF." },
      { status: 400 },
    );
  }

  const filename = `${randomUUID()}.${extension}`;

  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // access: "public" — единственный режим у Vercel Blob. Приватность здесь
      // держится на неугадываемом имени (uuid), а не на правах доступа: это
      // слабее, чем при хранении на диске, где файл отдаёт наш маршрут с
      // проверкой прав. Учитывайте это, если будете переезжать на Vercel.
      const blob = await put(`receipts/${filename}`, bytes, {
        access: "public",
        contentType: CONTENT_TYPE_BY_EXTENSION[extension],
      });
      return NextResponse.json({ url: blob.url });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), bytes);
  } catch (error) {
    console.error("[uploads] Не удалось сохранить чек:", error);
    return NextResponse.json({ error: "Что-то пошло не так. Попробуйте позже." }, { status: 500 });
  }

  console.log(`[uploads] user=${user.id} загрузил чек об оплате: ${filename}`);

  return NextResponse.json({ url: `/uploads/receipts/${filename}` });
}
