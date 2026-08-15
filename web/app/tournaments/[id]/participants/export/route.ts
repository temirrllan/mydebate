// Выгрузка списка участников турнира в CSV — кнопка «Скачать CSV» на
// /tournaments/[id]/participants (организатору нужен список для рассадки,
// рассылок и печати, а не только просмотр на экране).
//
// Route Handler, а не Server Action: отдаём файл (Content-Disposition), а
// Server Actions умеют возвращать только сериализуемые значения. Контроль
// доступа — тот же `listTournamentParticipants` (только владелец турнира),
// поэтому «чужая» выгрузка невозможна.
//
// Коды: гость → 401, не-владелец/несуществующий турнир → 404 (не палим
// разницу — соглашение из lib/auth/session.ts для Route Handlers).

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { listTournamentParticipants } from "@/lib/tournaments/queries";
import { REG_STATUS_SHORT_LABEL, LEVEL_LABEL } from "@/lib/format";

// Excel на Windows по умолчанию читает CSV в системной кодировке и делит
// строку по «;», а не по «,» — отсюда BOM + точка с запятой. Без BOM
// кириллица превращается в кракозябры.
const BOM = "\uFEFF";
const DELIMITER = ";";

const COLUMNS: { header: string; value: (p: Participant) => string }[] = [
  { header: "Статус", value: (p) => REG_STATUS_SHORT_LABEL[p.status] ?? p.status },
  { header: "Дата заявки", value: (p) => formatDateTime(p.createdAt) },
  { header: "ФИО (из анкеты)", value: (p) => p.fullName ?? "" },
  { header: "Имя в профиле", value: (p) => `${p.user.firstName} ${p.user.lastName}`.trim() },
  { header: "Email (из анкеты)", value: (p) => p.contactEmail ?? "" },
  { header: "Email аккаунта", value: (p) => p.user.email },
  { header: "Телефон", value: (p) => p.phone ?? "" },
  { header: "Класс / Курс", value: (p) => p.gradeOrCourse ?? "" },
  { header: "Школа / Университет", value: (p) => p.schoolOrUniversity ?? "" },
  { header: "Команда", value: (p) => p.teamName ?? "" },
  { header: "Тиммейты", value: (p) => p.teammateNames ?? "" },
  {
    header: "Уровень опыта",
    value: (p) => (p.experienceLevel ? LEVEL_LABEL[p.experienceLevel] ?? p.experienceLevel : ""),
  },
  { header: "Язык", value: (p) => p.preferredLanguage ?? "" },
  { header: "Доп. информация", value: (p) => p.additionalInfo ?? "" },
  // Оплата: в выгрузке достаточно отметки — сам файл открывается из карточки
  // участника на сайте, где работает проверка прав. Складывать в CSV прямую
  // ссылку не стоит: выгрузку пересылают и выкладывают в общие папки.
  { header: "Чек об оплате", value: (p) => (p.receiptUrl ? "приложен" : "нет") },
];

type Participant = NonNullable<
  Awaited<ReturnType<typeof listTournamentParticipants>>
>["participants"][number];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Route Handler не редиректит на /login (это не страница) — отдаём 401.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Необходимо войти в систему." }, { status: 401 });
  }

  const result = await listTournamentParticipants(id, user.id);
  if (!result) {
    return NextResponse.json({ error: "Турнир не найден." }, { status: 404 });
  }

  // Тот же фильтр, что и на странице: скачивается ровно то, что видно.
  const statusFilter = new URL(request.url).searchParams.get("status");
  const participants = statusFilter
    ? result.participants.filter((p) => p.status === statusFilter)
    : result.participants;

  const rows = [
    COLUMNS.map((c) => c.header),
    ...participants.map((p) => COLUMNS.map((c) => c.value(p))),
  ];
  const csv = BOM + rows.map((row) => row.map(escapeCsv).join(DELIMITER)).join("\r\n");

  console.log(
    `[participants] user=${user.id} выгрузил CSV tournament=${id} (${participants.length} строк)`,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${asciiFilename(result.tournament.title)}"; filename*=UTF-8''${encodeURIComponent(
        buildFilename(result.tournament.title),
      )}`,
      // Список меняется после каждого решения организатора — не кэшируем.
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Экранирование по RFC 4180: значение в кавычках, внутренние кавычки удвоены.
 * Оборачиваем всегда — так безопасно для переносов строк в «Доп. информации»
 * и не надо угадывать, какой символ встретится.
 */
function escapeCsv(value: string): string {
  return `"${value.replace(/\r?\n/g, " ").replace(/"/g, '""')}"`;
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Almaty",
  }).format(date);
}

function buildFilename(title: string): string {
  const slug = title.trim().replace(/[\\/:*?"<>|]/g, "").slice(0, 60) || "tournament";
  return `Участники — ${slug}.csv`;
}

/** Фолбэк для старых клиентов, не понимающих filename*=UTF-8''. */
function asciiFilename(title: string): string {
  const ascii = title.replace(/[^\x20-\x7E]/g, "").replace(/["\\]/g, "").trim();
  return `participants${ascii ? `-${ascii.slice(0, 40)}` : ""}.csv`;
}
