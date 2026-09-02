// Форматирование дат и человекочитаемых подписей для перечислений турниров.
// Используется карточкой турнира (components/tournaments/tournament-card.tsx)
// и страницами каталога/детали турнира в следующих этапах — держите здесь,
// не дублируйте по страницам.
import { LOCALE_TAG, type Locale } from "@/i18n/routing";
import {
  TournamentFormat,
  Level,
  LocationType,
  RegistrationStatus,
  TournamentStatus,
  SupportTicketStatus,
  Role,
} from "@/lib/enums";

export const FORMAT_LABEL: Record<string, string> = {
  [TournamentFormat.DEBATES]: "Дебаты",
  [TournamentFormat.MUN]: "MUN",
};

export const LEVEL_LABEL: Record<string, string> = {
  [Level.BEGINNER]: "Beginner",
  [Level.INTERMEDIATE]: "Intermediate",
  [Level.ADVANCED]: "Advanced",
};

export const LOCATION_TYPE_LABEL: Record<string, string> = {
  [LocationType.ONLINE]: "Онлайн",
  [LocationType.OFFLINE]: "Офлайн",
};

// Подписи статусов заявки на участие (Этап 4, макет "Профиль.png": «Регистрация
// подтверждена» / «Заявка принята» / «В листе ожидания» и т.п.) — не хардкодить
// по страницам, единый источник правды.
export const REG_STATUS_LABEL: Record<string, string> = {
  [RegistrationStatus.PENDING]: "Заявка на рассмотрении",
  [RegistrationStatus.ACCEPTED]: "Заявка принята",
  [RegistrationStatus.CONFIRMED]: "Регистрация подтверждена",
  [RegistrationStatus.WAITLIST]: "В листе ожидания",
  [RegistrationStatus.REJECTED]: "Заявка отклонена",
};

/** Тон Badge, соответствующий статусу заявки — держите в паре с REG_STATUS_LABEL. */
export const REG_STATUS_TONE: Record<string, "blue" | "green" | "orange" | "gray" | "red"> = {
  [RegistrationStatus.PENDING]: "orange",
  [RegistrationStatus.ACCEPTED]: "blue",
  [RegistrationStatus.CONFIRMED]: "green",
  [RegistrationStatus.WAITLIST]: "gray",
  [RegistrationStatus.REJECTED]: "red",
};

/**
 * Короткие подписи для управления заявками организатором (кнопки/фильтры на
 * /tournaments/[id]/participants). Отличаются от REG_STATUS_LABEL: там текст
 * с точки зрения участника («Заявка принята»), здесь — действие/срез
 * организатора («Принята»). Порядок массива задаёт порядок фильтров.
 */
export const REG_STATUS_SHORT_LABEL: Record<string, string> = {
  [RegistrationStatus.PENDING]: "На рассмотрении",
  [RegistrationStatus.ACCEPTED]: "Принята",
  [RegistrationStatus.CONFIRMED]: "Подтверждена",
  [RegistrationStatus.WAITLIST]: "Лист ожидания",
  [RegistrationStatus.REJECTED]: "Отклонена",
};

export const REG_STATUS_ORDER: string[] = [
  RegistrationStatus.PENDING,
  RegistrationStatus.ACCEPTED,
  RegistrationStatus.CONFIRMED,
  RegistrationStatus.WAITLIST,
  RegistrationStatus.REJECTED,
];

/**
 * «5 000 ₸» — сумма на языке интерфейса (разделитель разрядов у локалей
 * разный). Подпись «Бесплатно» сюда НЕ входит: она переводится и живёт в
 * словаре (tournament.free), а вызывающий код сам решает, что показать при
 * нулевой цене. Так функция остаётся чистым форматтером и не тянет за собой
 * словарь.
 */
export function formatPriceValue(price: number, locale: string): string {
  return `${price.toLocaleString(LOCALE_TAG[locale as Locale] ?? locale)} ₸`;
}

/**
 * @deprecated Осталось на страницах, до которых ещё не дошла локализация.
 * В переведённых местах: `price ? formatPriceValue(price, locale) : t("free")`.
 */
export function formatPrice(price: number | null | undefined): string {
  if (!price) return "Бесплатно";
  return formatPriceValue(price, "ru");
}

// Текст успеха регистрации на турнир — намеренно вынесен сюда (а НЕ экспортируется
// из lib/actions/registrations.ts, куда он концептуально принадлежит): в этой
// версии Next/Turbopack "use server"-файлы обязаны экспортировать ТОЛЬКО
// async-функции, если модуль попадает в клиентский бандл — а
// registerForTournament именно так и используется (client-форма
// app/tournaments/[id]/register/register-form.tsx через useActionState).
// Единственный источник правды для точного текста — не дублировать по коду.
export const REGISTRATION_SUCCESS_MESSAGE =
  "Спасибо за регистрацию. В скором времени вам придет письмо от организаторов турнира.";

// Подписи/тон статуса турнира для вкладки организатора «Мои турниры» (Этап 5)
// и админской очереди модерации. REJECTED (отклонён, с причиной) и HIDDEN
// (снят с публикации) — разные статусы, см. lib/enums.ts.
export const TOURNAMENT_STATUS_LABEL: Record<string, string> = {
  [TournamentStatus.DRAFT]: "Черновик",
  [TournamentStatus.PENDING]: "На модерации",
  [TournamentStatus.PUBLISHED]: "Опубликован",
  [TournamentStatus.REJECTED]: "Отклонён",
  [TournamentStatus.HIDDEN]: "Скрыт",
  [TournamentStatus.DELETED]: "Удалён",
};

export const TOURNAMENT_STATUS_TONE: Record<string, "blue" | "green" | "orange" | "gray" | "red"> = {
  [TournamentStatus.DRAFT]: "gray",
  [TournamentStatus.PENDING]: "orange",
  [TournamentStatus.PUBLISHED]: "green",
  [TournamentStatus.REJECTED]: "red",
  [TournamentStatus.HIDDEN]: "gray",
  [TournamentStatus.DELETED]: "red",
};

/**
 * Статус турнира → { label, tone } для Badge.
 *
 * rejectionReason учитывается ради турниров, отклонённых до появления статуса
 * REJECTED (тогда отказ писался как HIDDEN + причина) — такие записи всё ещё
 * показываем как «Отклонён», а не «Скрыт».
 */
export function getTournamentStatusDisplay(
  status: string,
  rejectionReason?: string | null,
): { key: string; tone: "blue" | "green" | "orange" | "gray" | "red" } {
  // Возвращаем КЛЮЧ статуса (namespace "enums.tournamentStatus"), а не текст:
  // подпись зависит от языка страницы, а он известен только при рендере.
  if (status === TournamentStatus.HIDDEN && rejectionReason) {
    return { key: TournamentStatus.REJECTED, tone: "red" };
  }
  return { key: status, tone: TOURNAMENT_STATUS_TONE[status] ?? "gray" };
}

// ---------------------------------------------------------------------------
// Казахские названия месяцев — своей таблицей, а не через Intl.
//
// ПОЧЕМУ: Chrome заявляет поддержку kk-KZ (supportedLocalesOf её возвращает),
// но данных по казахскому в его ICU нет — вместо «30 желтоқсан 2026» он
// печатает «2026 M12 30». В Node (полный ICU 78) всё правильно.
//
// Из-за этого одна и та же дата выглядела по-разному в серверных и клиентских
// компонентах, а у клиентского компонента, отрисованного и на сервере, и в
// браузере, разметка при гидрации не совпала бы.
//
// Русский и английский Chrome форматирует корректно — их оставляем Intl.
const MONTHS_KK = [
  "қаңтар", "ақпан", "наурыз", "сәуір", "мамыр", "маусым",
  "шілде", "тамыз", "қыркүйек", "қазан", "қараша", "желтоқсан",
];
const MONTHS_KK_SHORT = [
  "қаң.", "ақп.", "нау.", "сәу.", "мам.", "мау.",
  "шіл.", "там.", "қыр.", "қаз.", "қар.", "жел.",
];
/** Дни недели с понедельника — тоже отсутствуют в ICU браузера. */
export const WEEKDAYS_KK_SHORT = ["дс", "сс", "ср", "бс", "жм", "сб", "жс"];

export function kazakhMonths(short = false): string[] {
  return short ? [...MONTHS_KK_SHORT] : [...MONTHS_KK];
}

/** «2026 ж. 30 желтоқсан» — порядок как в CLDR, чтобы совпадал с серверным. */
function formatKazakhDate(d: Date, short: boolean): string {
  const months = short ? MONTHS_KK_SHORT : MONTHS_KK;
  return `${d.getUTCFullYear()} ж. ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

/**
 * «11 мая 2024» / «11 мамыр 2024» / «11 May 2024» — дата на языке интерфейса.
 *
 * timeZone: "UTC" обязателен. Даты турниров приходят из <input type="date"> и
 * лежат в базе как UTC-полночь; без явного пояса Intl форматирует их в поясе
 * сервера, и на любом сервере западнее Гринвича дата съезжала бы на день
 * назад — турнир 1 октября показывался бы как 30 сентября.
 */
export function formatDate(date: Date | string, locale: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (locale === "kk") return formatKazakhDate(d, false);
  return new Intl.DateTimeFormat(LOCALE_TAG[locale as Locale] ?? locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * «11 мая 2024, 14:30» — дата И время на языке интерфейса.
 *
 * Пояс здесь Asia/Almaty, а НЕ UTC как в formatDate, и это не разнобой:
 * formatDate показывает даты турниров, которые пришли из <input type="date">
 * и лежат как UTC-полночь — у них нет времени суток. А здесь настоящая
 * отметка времени (когда создали обращение), и её надо показывать в поясе
 * площадки: иначе администратор в Казахстане видит время на пять часов назад.
 *
 * Пояс задан явно ещё и ради гидрации: без него сервер отформатировал бы
 * время в своём поясе, браузер — в поясе пользователя, и React сообщил бы о
 * расхождении разметки.
 */
export function formatDateTime(date: Date | string, locale: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (locale === "kk") {
    // Время берём у Intl (цифры от локали не зависят), дату — своей таблицей.
    const time = new Intl.DateTimeFormat("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Almaty",
    }).format(d);
    return `${formatKazakhDate(d, false)}, ${time}`;
  }
  return new Intl.DateTimeFormat(LOCALE_TAG[locale as Locale] ?? locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Almaty",
  }).format(d);
}

/** «11 мая 2024» коротким месяцем: «11 мая 2024» → «11 мая 2024 г.» → «11 мая 24». */
export function formatDateShort(date: Date | string, locale: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (locale === "kk") return formatKazakhDate(d, true);
  return new Intl.DateTimeFormat(LOCALE_TAG[locale as Locale] ?? locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * @deprecated Осталось на страницах, до которых ещё не дошла локализация.
 * В переведённых местах используйте formatDate(date, locale) — иначе
 * казахоязычный пользователь видит русские названия месяцев.
 */
export function formatDateRu(date: Date | string): string {
  return formatDate(date, "ru");
}

/**
 * Регистрация открыта, пока текущий момент раньше конца дня дедлайна
 * (включительно весь день дедлайна — spec: "если дедлайн не прошёл").
 *
 * `<input type="date">` отдаёт строку "YYYY-MM-DD", а `new Date("YYYY-MM-DD")`
 * парсится как UTC-полночь этого дня. Если сравнивать напрямую с Date.now(),
 * регистрация закрывается уже в начале суток дедлайна по UTC — то есть ещё ДО
 * местной полуночи в часовых поясах восточнее UTC (например, Казахстан,
 * UTC+5). Поэтому сравниваем не с началом, а с концом суток дедлайна по UTC
 * (23:59:59.999) — копия даты, исходный объект не мутируется.
 */
export function isRegistrationOpen(deadline: Date | string): boolean {
  const d = typeof deadline === "string" ? new Date(deadline) : new Date(deadline);
  const endOfDeadlineDay = new Date(d);
  endOfDeadlineDay.setUTCHours(23, 59, 59, 999);
  return endOfDeadlineDay.getTime() >= Date.now();
}

/**
 * UTC-полночь текущих суток — граница «турнир ещё не прошёл» для каталога.
 * Даты турниров приходят из `<input type="date">` и хранятся как UTC-полночь
 * дня (см. isRegistrationOpen), поэтому сравнивать их надо с такой же
 * UTC-полуночью, а не с текущим моментом: иначе сегодняшний турнир пропадал
 * бы из каталога уже с первой секунды дня.
 */
export function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Подписи роли пользователя (Этап 6, админ-панель: таблица пользователей/организаторов).
export const ROLE_LABEL: Record<string, string> = {
  [Role.USER]: "Пользователь",
  [Role.ORGANIZER]: "Организатор",
  [Role.ADMIN]: "Администратор",
};

// Подписи/тон статуса обращения в поддержку (Этап 6, spec §7 "Support tickets").
export const SUPPORT_TICKET_STATUS_LABEL: Record<string, string> = {
  [SupportTicketStatus.OPEN]: "Открыто",
  [SupportTicketStatus.ANSWERED]: "Отвечено",
  [SupportTicketStatus.CLOSED]: "Закрыто",
};

export const SUPPORT_TICKET_STATUS_TONE: Record<string, "blue" | "green" | "orange" | "gray" | "red"> = {
  [SupportTicketStatus.OPEN]: "orange",
  [SupportTicketStatus.ANSWERED]: "blue",
  [SupportTicketStatus.CLOSED]: "gray",
};

// Текст успеха отправки обращения в поддержку (Этап 7) — вынесен сюда по той
// же причине, что и REGISTRATION_SUCCESS_MESSAGE выше: lib/actions/support.ts
// это "use server" файл, используемый клиентской формой через
// useActionState, а такие файлы обязаны экспортировать только async-функции.
export const SUPPORT_TICKET_SUCCESS_MESSAGE =
  "Ваше обращение отправлено. Мы ответим вам в ближайшее время.";

// Текст успеха редактирования турнира организатором (Этап 7) — та же причина
// выноса, см. выше; используется client-формой редактирования турнира.
export const EDIT_TOURNAMENT_SUCCESS_MESSAGE = "Изменения сохранены.";
