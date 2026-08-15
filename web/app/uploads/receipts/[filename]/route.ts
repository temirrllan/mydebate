// Отдача чеков об оплате — в отличие от обложек турниров, с проверкой прав.
//
// Почему не как обложки. Обложка публична по смыслу, её видят все. На чеке —
// имя плательщика, сумма и реквизиты, поэтому «неугадываемое имя файла»
// защитой не считается: ссылка утекает через историю браузера, пересланное
// сообщение, логи прокси. Здесь настоящая проверка: файл получает только тот,
// кто имеет к нему отношение.
//
// Кому можно:
//   * автору заявки — это его собственный чек;
//   * организатору турнира — ради него чек и загружали;
//   * админу — разбор спорных ситуаций и поддержка.
//
// Всем остальным 404, а не 403: 403 подтвердил бы, что такой файл существует.
//
// Файлы лежат вне public/ — иначе Next отдавал бы их статикой в обход этой
// проверки (подробности в комментарии к UPLOAD_DIR ниже).
import { readFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/enums";

// Каталог вне public/ — см. объяснение в
// app/api/uploads/payment-receipt/route.ts: всё, что лежит в public/ на
// момент старта сервера, Next отдаёт статикой мимо этой проверки прав.
const UPLOAD_DIR = path.join(process.cwd(), "data", "receipts");

/** Имя задаёт загрузчик: uuid + расширение. Из такого сегмента не собрать выход за каталог. */
const FILENAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/i;

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  if (!FILENAME_PATTERN.test(filename)) {
    return new NextResponse(null, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 404 });

  // Ищем заявку по ссылке на чек — она и связывает файл с участником и
  // турниром, а значит определяет, кому его показывать.
  const registration = await prisma.registration.findFirst({
    where: { receiptUrl: `/uploads/receipts/${filename}` },
    select: { userId: true, tournament: { select: { organizerId: true } } },
  });
  if (!registration) return new NextResponse(null, { status: 404 });

  const allowed =
    registration.userId === user.id ||
    registration.tournament.organizerId === user.id ||
    user.role === Role.ADMIN;
  if (!allowed) return new NextResponse(null, { status: 404 });

  const extension = filename.split(".").pop()!.toLowerCase();

  let bytes: Buffer;
  try {
    bytes = await readFile(path.join(UPLOAD_DIR, filename));
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": CONTENT_TYPE_BY_EXTENSION[extension],
      "Content-Length": String(bytes.length),
      // inline — чтобы чек открывался во вкладке, а не скачивался файлом.
      "Content-Disposition": `inline; filename="${filename}"`,
      // private: ответ зависит от того, кто спрашивает, поэтому его нельзя
      // класть в общий кэш прокси — иначе чек одного участника уедет другому.
      "Cache-Control": "private, no-store",
    },
  });
}
