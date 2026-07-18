// Форматирование дат и человекочитаемых подписей для перечислений турниров.
// Используется карточкой турнира (components/tournaments/tournament-card.tsx)
// и страницами каталога/детали турнира в следующих этапах — держите здесь,
// не дублируйте по страницам.
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
};

/** Тон Badge, соответствующий статусу заявки — держите в паре с REG_STATUS_LABEL. */
export const REG_STATUS_TONE: Record<string, "blue" | "green" | "orange" | "gray"> = {
  [RegistrationStatus.PENDING]: "orange",
  [RegistrationStatus.ACCEPTED]: "blue",
  [RegistrationStatus.CONFIRMED]: "green",
  [RegistrationStatus.WAITLIST]: "gray",
};

/** «5 000 ₸» — цена участия, 0/undefined → «Бесплатно». */
export function formatPrice(price: number | null | undefined): string {
  if (!price) return "Бесплатно";
  return `${price.toLocaleString("ru-RU")} ₸`;
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
): { label: string; tone: "blue" | "green" | "orange" | "gray" | "red" } {
  if (status === TournamentStatus.HIDDEN && rejectionReason) {
    return { label: "Отклонён", tone: "red" };
  }
  return {
    label: TOURNAMENT_STATUS_LABEL[status] ?? status,
    tone: TOURNAMENT_STATUS_TONE[status] ?? "gray",
  };
}

/** «11 мая 2024» — русская локаль, без времени. */
export function formatDateRu(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
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
