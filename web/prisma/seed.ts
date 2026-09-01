// `tsx prisma/seed.ts` runs standalone (outside Next.js), so .env is not
// loaded automatically — load it explicitly, same as prisma.config.ts does.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import {
  Role,
  Level,
  TournamentFormat,
  LocationType,
  TournamentStatus,
  RegistrationStatus,
  NotificationType,
  SupportTicketStatus,
} from "../lib/enums";

// Тестовый пароль для всех демо-пользователей (см. отчёт агента).
const DEMO_PASSWORD = "password123";

// ---------------------------------------------------------------------------
// Даты демо-данных
//
// Задаются СМЕЩЕНИЕМ ОТ СЕГОДНЯ, а не абсолютными значениями. Раньше здесь
// стояли конкретные даты («сегодня = 2026-07-05»), и через пару месяцев после
// написания сида все «предстоящие» турниры оказывались в прошлом: каталог
// пустел, а демо переставало показывать то, ради чего существует. Со
// смещениями сид остаётся правдивым в любой день, когда его запустят.
//
// Точка отсчёта — полночь по UTC, как у startOfToday() в lib/format.ts:
// каталог сравнивает даты турниров именно с ней.
// ---------------------------------------------------------------------------

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Дата на N дней вперёд (отрицательное — назад) от сегодня, в указанный час UTC. */
function daysFromToday(days: number, hour = 9): Date {
  const d = todayUTC();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

/**
 * Дедлайн регистрации — конец суток на N дней от сегодня. Именно так его
 * трактует isRegistrationOpen (lib/format.ts): весь день дедлайна регистрация
 * ещё открыта, и турнир ещё в каталоге.
 */
function deadlineIn(days: number): Date {
  const d = todayUTC();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(23, 59, 59, 0);
  return d;
}

async function main() {
  console.log("Очистка данных...");
  // Порядок важен из-за внешних ключей: дети раньше родителей.
  await prisma.notification.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.tournamentSection.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log("Создание пользователей...");
  await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "MyDebate",
      email: "admin@mydebate.kz",
      passwordHash,
      role: Role.ADMIN,
      city: "Астана",
    },
  });

  const organizer = await prisma.user.create({
    data: {
      firstName: "Ерлан",
      lastName: "Сапаров",
      email: "organizer@mydebate.kz",
      passwordHash,
      role: Role.ORGANIZER,
      city: "Астана",
      school: "Debate Union",
      experience: "Организатор дебатных турниров и MUN-конференций более 5 лет",
      bio: "Организую турниры по дебатам и модели ООН в Казахстане.",
      languages: "Русский,English",
    },
  });

  const participant = await prisma.user.create({
    data: {
      firstName: "Санжар",
      lastName: "Тулегенов",
      email: "sanzhar@mydebate.kz",
      passwordHash,
      role: Role.USER,
      city: "Астана",
      school: "Nazarbayev University",
      major: "Международные отношения",
      level: Level.INTERMEDIATE,
      languages: "Русский,English",
      experience: "Участвовал в 6 турнирах по дебатам и MUN",
      bio: "Дебатёр и делегат MUN, интересуюсь международными отношениями.",
    },
  });

  console.log("Создание турниров...");

  // --- Предстоящие, регистрация открыта: их и показывает каталог ---

  const astanaDebateCup = await prisma.tournament.create({
    data: {
      title: "Astana Debate Cup",
      description:
        "Ежегодный дебатный турнир для команд среднего уровня подготовки. Формат British Parliamentary.",
      format: TournamentFormat.DEBATES,
      locationType: LocationType.OFFLINE,
      level: Level.INTERMEDIATE,
      languages: "Русский,English",
      startDate: daysFromToday(40),
      endDate: daysFromToday(41, 18),
      registrationDeadline: deadlineIn(26),
      price: 5000,
      city: "Астана",
      address: "пр. Мангилик Ел, 55",
      venue: "Nazarbayev University",
      status: TournamentStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  });

  const arysMun = await prisma.tournament.create({
    data: {
      title: "ArysMUN 2.0",
      description:
        "Крупнейшая модель ООН в Астане. 6 комитетов, международные делегаты, официальная культурная программа.",
      format: TournamentFormat.MUN,
      locationType: LocationType.OFFLINE,
      level: Level.ADVANCED,
      languages: "Русский,English,Қазақша",
      startDate: daysFromToday(65),
      endDate: daysFromToday(67, 18),
      registrationDeadline: deadlineIn(50),
      price: 8000,
      city: "Астана",
      address: "ул. Кабанбай батыра, 53",
      venue: "AlmaU Conference Hall",
      status: TournamentStatus.PUBLISHED,
      organizerId: organizer.id,
      sections: {
        create: [
          { title: "UNHRC", description: "Совет по правам человека ООН.", order: 0 },
          { title: "Security Council", description: "Совет Безопасности ООН.", order: 1 },
          { title: "WHO", description: "Всемирная организация здравоохранения.", order: 2 },
          { title: "UNEP", description: "Программа ООН по окружающей среде.", order: 3 },
          { title: "DISEC", description: "Комитет по разоружению и международной безопасности.", order: 4 },
          { title: "ECOSOC", description: "Экономический и Социальный Совет ООН.", order: 5 },
        ],
      },
    },
  });

  const almatyOpenDebate = await prisma.tournament.create({
    data: {
      title: "Almaty Open Debate",
      description: "Открытый турнир по дебатам для начинающих команд.",
      format: TournamentFormat.DEBATES,
      locationType: LocationType.OFFLINE,
      level: Level.BEGINNER,
      languages: "Русский",
      startDate: daysFromToday(15),
      endDate: daysFromToday(15, 19),
      registrationDeadline: deadlineIn(10),
      price: 0,
      city: "Алматы",
      address: "ул. Толе би, 100",
      venue: "КазНУ им. аль-Фараби",
      status: TournamentStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  });

  await prisma.tournament.create({
    data: {
      title: "Online Debate Challenge",
      description: "Онлайн-турнир по дебатам для новичков, участие через Zoom.",
      format: TournamentFormat.DEBATES,
      locationType: LocationType.ONLINE,
      level: Level.BEGINNER,
      languages: "Русский,English",
      startDate: daysFromToday(20),
      endDate: daysFromToday(20, 18),
      registrationDeadline: deadlineIn(15),
      price: 0,
      status: TournamentStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  });

  const greatSteppeMun = await prisma.tournament.create({
    data: {
      title: "Great Steppe MUN",
      description: "Модель ООН, посвящённая вопросам устойчивого развития Центральной Азии.",
      format: TournamentFormat.MUN,
      locationType: LocationType.OFFLINE,
      level: Level.ADVANCED,
      languages: "Русский,English",
      startDate: daysFromToday(90),
      endDate: daysFromToday(92, 18),
      registrationDeadline: deadlineIn(75),
      price: 10000,
      city: "Алматы",
      address: "пр. Аль-Фараби, 71",
      venue: "Almaty Management University",
      status: TournamentStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  });

  // --- Дедлайн прошёл, но турнир ещё впереди ---
  //
  // Каталог такие турниры НЕ показывает (см. buildWhere в
  // lib/tournaments/queries.ts): подать заявку уже нельзя. Оставлены в сиде
  // намеренно — на них проверяется и само правило скрытия, и то, что у
  // организатора турнир при этом никуда не делся.

  await prisma.tournament.create({
    data: {
      title: "Nur-Sultan Schools Debate",
      description: "Школьный турнир по дебатам среди старшеклассников Астаны.",
      format: TournamentFormat.DEBATES,
      locationType: LocationType.OFFLINE,
      level: Level.BEGINNER,
      languages: "Русский",
      startDate: daysFromToday(13),
      endDate: daysFromToday(13, 17),
      registrationDeadline: deadlineIn(-4),
      price: 2000,
      city: "Астана",
      address: "ул. Достык, 12",
      venue: "Школа-лицей №34",
      status: TournamentStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  });

  const shymkentDebateLeague = await prisma.tournament.create({
    data: {
      title: "Shymkent Debate League",
      description: "Региональная дебатная лига Шымкента и Туркестанской области.",
      format: TournamentFormat.DEBATES,
      locationType: LocationType.OFFLINE,
      level: Level.INTERMEDIATE,
      languages: "Русский,Қазақша",
      startDate: daysFromToday(30),
      endDate: daysFromToday(31, 18),
      registrationDeadline: deadlineIn(-2),
      price: 4000,
      city: "Шымкент",
      address: "ул. Байтурсынова, 5",
      venue: "ЮКУ им. М. Ауэзова",
      status: TournamentStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  });

  // --- Прошедшие турниры (история) ---

  // Год в названии берём из вычисленной даты, а не пишем руками: с
  // относительными датами «Kazakhstan Model UN 2024» рано или поздно
  // разошлось бы с тем, что показано на карточке.
  const kazakhstanModelUnStart = daysFromToday(-300);

  const kazakhstanModelUn = await prisma.tournament.create({
    data: {
      title: `Kazakhstan Model UN ${kazakhstanModelUnStart.getUTCFullYear()}`,
      description: "Национальная модель ООН с участием делегаций со всего Казахстана.",
      format: TournamentFormat.MUN,
      locationType: LocationType.OFFLINE,
      level: Level.ADVANCED,
      languages: "Русский,English",
      startDate: kazakhstanModelUnStart,
      endDate: daysFromToday(-298, 18),
      registrationDeadline: deadlineIn(-315),
      price: 6000,
      city: "Алматы",
      address: "пр. Достык, 220",
      venue: "КИМЭП",
      status: TournamentStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  });

  await prisma.tournament.create({
    data: {
      title: "Debate Challenge Cup",
      description: "Кубок по дебатам среди студенческих команд.",
      format: TournamentFormat.DEBATES,
      locationType: LocationType.OFFLINE,
      level: Level.INTERMEDIATE,
      languages: "Русский",
      startDate: daysFromToday(-120),
      endDate: daysFromToday(-119, 18),
      registrationDeadline: deadlineIn(-130),
      price: 3500,
      city: "Шымкент",
      address: "ул. Кунаева, 8",
      venue: "ЮКГУ им. М. Ауэзова",
      status: TournamentStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  });

  await prisma.tournament.create({
    data: {
      title: "Central Asia MUN",
      description: "Региональная модель ООН с участием делегатов из стран Центральной Азии.",
      format: TournamentFormat.MUN,
      locationType: LocationType.OFFLINE,
      level: Level.INTERMEDIATE,
      languages: "Русский,English",
      startDate: daysFromToday(-170),
      endDate: daysFromToday(-168, 18),
      registrationDeadline: deadlineIn(-185),
      price: 7000,
      city: "Алматы",
      address: "ул. Фурманова, 187",
      venue: "Универсиада Холл",
      status: TournamentStatus.PUBLISHED,
      organizerId: organizer.id,
    },
  });

  // --- На модерации (PENDING) ---

  await prisma.tournament.create({
    data: {
      title: "Debate Academy Cup",
      description: "Новый турнир по дебатам для команд Карагандинской области.",
      format: TournamentFormat.DEBATES,
      locationType: LocationType.OFFLINE,
      level: Level.BEGINNER,
      languages: "Русский",
      startDate: daysFromToday(120),
      endDate: daysFromToday(121, 18),
      registrationDeadline: deadlineIn(100),
      price: 5000,
      city: "Караганда",
      address: "ул. Ерубаева, 1",
      venue: "КарГУ им. Е.А. Букетова",
      status: TournamentStatus.PENDING,
      organizerId: organizer.id,
    },
  });

  console.log("Создание регистраций и избранного...");

  await prisma.registration.createMany({
    data: [
      {
        userId: participant.id,
        tournamentId: astanaDebateCup.id,
        status: RegistrationStatus.ACCEPTED,
      },
      {
        userId: participant.id,
        tournamentId: almatyOpenDebate.id,
        status: RegistrationStatus.PENDING,
      },
      {
        userId: participant.id,
        tournamentId: kazakhstanModelUn.id,
        status: RegistrationStatus.CONFIRMED,
      },
    ],
  });

  await prisma.favorite.createMany({
    data: [
      { userId: participant.id, tournamentId: arysMun.id },
      { userId: participant.id, tournamentId: greatSteppeMun.id },
    ],
  });

  console.log("Создание уведомлений и обращения в поддержку...");

  await prisma.notification.createMany({
    data: [
      {
        userId: participant.id,
        type: NotificationType.NEW_REGISTRATION,
        title: "Регистрация подтверждена",
        message: `Ваша регистрация на турнир "${astanaDebateCup.title}" подтверждена организатором.`,
        isRead: false,
        link: `/tournaments/${astanaDebateCup.id}`,
      },
      {
        userId: participant.id,
        type: NotificationType.DEADLINE_SOON,
        title: "Дедлайн регистрации скоро истекает",
        message: `Регистрация на турнир "${shymkentDebateLeague.title}" закрывается совсем скоро.`,
        isRead: true,
        link: `/tournaments/${shymkentDebateLeague.id}`,
      },
    ],
  });

  await prisma.supportTicket.create({
    data: {
      userId: participant.id,
      email: participant.email,
      subject: "Проблема с оплатой участия",
      message: "Оплатил участие в турнире, но статус регистрации не обновился. Помогите разобраться.",
      status: SupportTicketStatus.OPEN,
    },
  });

  const [userCount, tournamentCount, sectionCount, registrationCount, favoriteCount, notificationCount, ticketCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.tournament.count(),
      prisma.tournamentSection.count(),
      prisma.registration.count(),
      prisma.favorite.count(),
      prisma.notification.count(),
      prisma.supportTicket.count(),
    ]);

  console.log("Готово. Записано:");
  console.log({
    users: userCount,
    tournaments: tournamentCount,
    tournamentSections: sectionCount,
    registrations: registrationCount,
    favorites: favoriteCount,
    notifications: notificationCount,
    supportTickets: ticketCount,
  });
  console.log(`Тестовый пароль для всех демо-пользователей: ${DEMO_PASSWORD}`);
  console.log(`admin@mydebate.kz / organizer@mydebate.kz / sanzhar@mydebate.kz`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
