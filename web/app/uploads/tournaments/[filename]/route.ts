// Отдача загруженных обложек и логотипов турниров.
//
// Зачем это нужно отдельным маршрутом, хотя файлы лежат в public/.
// Next составляет список файлов public/ на этапе СБОРКИ. Всё, что дописано
// туда во время работы приложения (а обложки именно так и появляются —
// app/api/uploads/tournament-image/route.ts), сервер не отдаёт: на запрос
// /uploads/tournaments/<файл>.png приходит 404. В `next dev` этого не видно —
// там каталог читается с диска на каждый запрос, поэтому баг проявляется
// только на собранном приложении.
//
// Поэтому файлы отдаём сами. Маршрут публичный: обложки видны на главной,
// в том числе гостю (proxy.ts исключает из проверок пути с расширениями
// изображений, см. его `matcher`).
//
// Режим Vercel Blob этого маршрута не касается — там URL абсолютный и ведёт
// прямо в хранилище, мимо приложения.
import { readFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "tournaments");

/**
 * Имя файла задаёт загрузчик: uuid + расширение по сигнатуре содержимого.
 * Проверяем строго по этому шаблону, а не просто «нет ли ..» — из сегмента
 * пути тогда физически нельзя собрать выход за пределы каталога, и заодно
 * отсекается запрос произвольного файла с диска.
 */
const FILENAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (!FILENAME_PATTERN.test(filename)) {
    return new NextResponse(null, { status: 404 });
  }

  const extension = filename.split(".").pop()!.toLowerCase();

  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(UPLOAD_DIR, filename));
  } catch {
    // Файла нет — это обычная 404, а не сбой: ссылка могла остаться в БД от
    // удалённого файла. Шуметь в логах тут не о чем.
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": CONTENT_TYPE_BY_EXTENSION[extension],
      "Content-Length": String(bytes.length),
      // Имя файла — uuid, содержимое по нему никогда не меняется, поэтому
      // кэшируем надолго и у клиента, и на промежуточных узлах.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
