import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  Calendar,
  MapPin,
  Globe,
  Languages,
  Wallet,
  User as UserIcon,
  Users,
  Mail as MailIcon,
  LayoutGrid,
  Trophy,
  ExternalLink,
} from "lucide-react";
import { InstagramIcon, TelegramIcon, TikTokIcon } from "@/components/icons/social";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CtaBanner } from "@/components/ui/cta-banner";
import { FavoriteButton } from "@/components/tournaments/favorite-button";
import { CoverPlaceholder } from "@/components/tournaments/cover-placeholder";
import { getTournamentDetail } from "@/lib/tournaments/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { getFavoriteTournamentIds } from "@/lib/actions/favorites";
import { getMyRegistrations } from "@/lib/profile/queries";
import { TournamentFormat, RegistrationType, LocationType, parseLanguages } from "@/lib/enums";
import { REG_STATUS_TONE, formatDate, formatPriceValue, isRegistrationOpen } from "@/lib/format";
import { cn } from "@/lib/utils";
import { absoluteUrl } from "@/lib/site";
import { normalizeSocialUrl } from "@/lib/social";
import { localeAlternates } from "@/lib/i18n/alternates";
import type { Locale } from "@/i18n/routing";

/** Аннотация для поиска и превью: первые ~160 символов описания одной строкой. */
function buildDescription(
  tournament: { description: string; city: string | null; startDate: Date },
  locale: string,
  onlineLabel: string,
): string {
  const where = tournament.city ? `${tournament.city}, ` : `${onlineLabel}, `;
  const when = formatDate(tournament.startDate, locale);
  const prefix = `${where}${when}. `;
  const text = tournament.description.replace(/\s+/g, " ").trim();
  const room = 160 - prefix.length;
  return prefix + (text.length > room ? `${text.slice(0, room - 1).trimEnd()}…` : text);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const tournament = await getTournamentDetail(id);
  const t = await getTranslations({ locale, namespace: "tournament" });
  if (!tournament) return { title: t("notFound") };

  const tCommon = await getTranslations({ locale, namespace: "common" });
  const description = buildDescription(tournament, locale, tCommon("online"));
  const url = `/tournaments/${id}`;

  return {
    title: tournament.title,
    description,
    // canonical говорит поисковику, какой адрес считать главным: на страницу
    // могут вести ссылки с метками рекламных кампаний, и без этого он
    // посчитал бы их разными страницами с одинаковым содержимым.
    alternates: localeAlternates(url, locale as Locale),
    openGraph: {
      type: "article",
      url,
      title: tournament.title,
      description,
      // Относительный путь достаточен: абсолютным его сделает metadataBase
      // из app/layout.tsx.
      images: tournament.coverImage ? [tournament.coverImage] : undefined,
    },
  };
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const tournament = await getTournamentDetail(id);
  if (!tournament) notFound();

  const t = await getTranslations("tournament");
  const tCommon = await getTranslations("common");
  const tEnum = await getTranslations("enums");
  const tNav = await getTranslations("nav");
  const tCard = await getTranslations("tournamentCard");

  // Страница турнира открыта всем — с неё и приходят люди из поиска
  // (см. proxy.ts). Гостю показываем всё то же самое, кроме личных вещей:
  // избранного и статуса собственной заявки. Кнопка «Зарегистрироваться»
  // ведёт на защищённый маршрут, поэтому гостя аккуратно отправит на вход.
  const user = await getCurrentUser();
  const [favoriteIds, myRegistrations] = user
    ? await Promise.all([getFavoriteTournamentIds(user.id), getMyRegistrations(user.id)])
    : [new Set<string>(), []];
  const myRegistration = myRegistrations.find((r) => r.tournament.id === tournament.id);

  const open = isRegistrationOpen(tournament.registrationDeadline);
  const languages = parseLanguages(tournament.languages);
  const sectionsLabel =
    tournament.format === TournamentFormat.MUN ? t("committees") : t("sections");
  // Внешняя регистрация (spec §7): организатор указывает стороннюю ссылку
  // вместо формы платформы — CTA должен вести на неё, а не на
  // /tournaments/[id]/register (внутренняя форма для таких турниров вообще
  // недоступна, см. guard в register/page.tsx).
  const isExternal = tournament.registrationType === RegistrationType.EXTERNAL && Boolean(tournament.externalUrl);

  // Соцсети организатор вводит как придётся («@mydebate», «tiktok.com/
  // @mydebate», полная ссылка) — в href нужен абсолютный https-адрес, иначе
  // браузер считает значение путём внутри сайта и открывает 404 вместо
  // профиля. normalizeSocialUrl вернёт null для мусора и чужих протоколов —
  // такую иконку просто не рисуем.
  const socialLinks = [
    {
      key: "instagram",
      href: normalizeSocialUrl(tournament.instagram, "instagram"),
      label: t("instagramLabel"),
      Icon: InstagramIcon,
    },
    {
      key: "tiktok",
      href: normalizeSocialUrl(tournament.tiktok, "tiktok"),
      label: t("tiktokLabel"),
      Icon: TikTokIcon,
    },
    {
      key: "telegram",
      href: normalizeSocialUrl(tournament.telegram, "telegram"),
      label: t("telegramLabel"),
      Icon: TelegramIcon,
    },
  ].filter((link): link is typeof link & { href: string } => Boolean(link.href));

  // Разметка события по schema.org. Обычный текст страницы поисковик читает
  // как текст, а отсюда достаёт факты однозначно: когда, где, почём. Благодаря
  // ей турнир может показаться в выдаче карточкой с датой и городом, а не
  // просто синей ссылкой. Заполняем только то, что действительно знаем —
  // выдуманные поля хуже отсутствующих.
  const isOnline = tournament.locationType === LocationType.ONLINE;
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: tournament.title,
    description: buildDescription(tournament, locale, tCommon("online")),
    startDate: new Date(tournament.startDate).toISOString(),
    ...(tournament.endDate ? { endDate: new Date(tournament.endDate).toISOString() } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: isOnline
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    url: absoluteUrl(`/tournaments/${tournament.id}`),
    ...(tournament.coverImage ? { image: [absoluteUrl(tournament.coverImage)] } : {}),
    location: isOnline
      ? { "@type": "VirtualLocation", url: absoluteUrl(`/tournaments/${tournament.id}`) }
      : {
          "@type": "Place",
          name: tournament.venue ?? tournament.city ?? "Казахстан",
          address: {
            "@type": "PostalAddress",
            addressCountry: "KZ",
            ...(tournament.city ? { addressLocality: tournament.city } : {}),
            ...(tournament.address ? { streetAddress: tournament.address } : {}),
          },
        },
    offers: {
      "@type": "Offer",
      price: tournament.price,
      priceCurrency: "KZT",
      url: absoluteUrl(`/tournaments/${tournament.id}`),
      availability: open ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Данные наши собственные и сериализуются JSON.stringify, но экранируем
        // "<" — иначе строка вида "</script>" в описании турнира закрыла бы тег.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(eventJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* Hero — тёмная карточка: слева текст, справа обложка турнира (макет
          `maket/Страница турнира.png`). Раньше обложка лежала фоном на всю
          секцию с `opacity-40` под плотным градиентом и как фотография не
          читалась вовсе — было видно только тёмно-синее пятно. */}
      <Container className="py-6 sm:py-8">
        <Breadcrumbs
          items={[
            { label: tNav("home"), href: "/" },
            { label: tNav("tournaments"), href: "/tournaments" },
            { label: tournament.title },
          ]}
        />

        <section className="relative mt-5 overflow-hidden rounded-2xl bg-navy-900">
          {/* На широких экранах обложка занимает правую часть карточки и видна
              в полную силу; на узких — уходит фоном под затемнение, иначе
              белому тексту негде разместиться. */}
          <div className="absolute inset-0 lg:left-1/5">
            {tournament.coverImage ? (
              <Image
                src={tournament.coverImage}
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 80vw, 100vw"
                className="object-cover"
              />
            ) : (
              <CoverPlaceholder
                seed={tournament.id}
                title={tournament.title}
                // До lg заглушка лежит прямо под заголовком, и монограмма
                // просвечивает сквозь него; там оставляем только градиент.
                monogramClassName="hidden lg:flex"
              />
            )}
          </div>
          <div
            // `lg:bg-transparent` обязателен: `bg-navy-900/80` задаёт
            // background-color, а `bg-gradient-to-*` — background-image, и без
            // сброса цвета сплошная заливка осталась бы поверх фотографии.
            className="pointer-events-none absolute inset-0 bg-navy-900/80 lg:bg-transparent lg:bg-gradient-to-r lg:from-navy-900 lg:from-35% lg:via-navy-900/55 lg:via-58% lg:to-transparent"
            aria-hidden="true"
          />

          <div className="relative px-6 py-10 sm:px-9 sm:py-12 lg:max-w-[64%]">
            <div className="flex items-start justify-between gap-4">
              <div>
                {tournament.logoImage && (
                  <div className="mb-4 h-14 w-14 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20">
                    <Image
                      src={tournament.logoImage}
                      alt=""
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <Badge tone={open ? "green" : "gray"}>
                  {open ? tCard("registrationOpen") : tCard("registrationClosed")}
                </Badge>
                <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
                  {tournament.title}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar size={16} /> {formatDate(tournament.startDate, locale)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={16} /> {tournament.city ?? tCommon("online")}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Globe size={16} /> {tEnum(`locationType.${tournament.locationType}`)}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="blue">{tEnum(`format.${tournament.format}`)}</Badge>
                  {tournament.level && (
                    <Badge tone="purple">{tEnum(`level.${tournament.level}`)}</Badge>
                  )}
                </div>
              </div>

              {user && (
                <FavoriteButton
                  tournamentId={tournament.id}
                  initialFavorited={favoriteIds.has(tournament.id)}
                  className="bg-white/15 text-white hover:text-rose-400"
                />
              )}
            </div>

            <div className="mt-8">
              {myRegistration ? (
                <Badge tone={REG_STATUS_TONE[myRegistration.status] ?? "gray"} className="px-4 py-2 text-sm">
                  {tEnum(`regStatus.${myRegistration.status}`)}
                </Badge>
              ) : isExternal ? (
                open ? (
                  <Button asChild size="lg">
                    <a href={tournament.externalUrl!} target="_blank" rel="noreferrer">
                      <ExternalLink size={18} /> {t("registerExternal")}
                    </a>
                  </Button>
                ) : (
                  <Button size="lg" disabled>
                    {t("registrationClosed")}
                  </Button>
                )
              ) : open ? (
                <Button asChild size="lg">
                  <Link href={`/tournaments/${tournament.id}/register`}>{t("register")}</Link>
                </Button>
              ) : (
                <Button size="lg" disabled>
                  {t("registrationClosed")}
                </Button>
              )}
            </div>
          </div>
        </section>
      </Container>

      <Container className="grid gap-8 pb-10 lg:grid-cols-3 lg:pb-14">
        {/* Основной контент */}
        <div className="space-y-8 lg:col-span-2">
          <Card className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-navy-900">{t("about")}</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-muted">
              {tournament.description}
            </p>
          </Card>

          {tournament.sections.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-navy-900">{sectionsLabel}</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {tournament.sections.map((section) => (
                  <Card key={section.id} className="p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <LayoutGrid size={20} />
                    </div>
                    <h3 className="mt-3 font-semibold text-ink">{section.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{section.description}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Сайдбар */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-bold text-navy-900">{t("details")}</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <DetailRow
                icon={Globe}
                label={t("format")}
                value={tEnum(`format.${tournament.format}`)}
              />
              <DetailRow
                icon={Calendar}
                label={t("startDate")}
                value={formatDate(tournament.startDate, locale)}
              />
              <DetailRow
                icon={Calendar}
                label={t("deadline")}
                value={formatDate(tournament.registrationDeadline, locale)}
              />
              <DetailRow
                icon={MapPin}
                label={t("venue")}
                value={tournament.venue ?? tournament.address ?? tournament.city ?? tCommon("online")}
              />
              <DetailRow icon={Languages} label={t("language")} value={languages.join(", ") || "—"} />
              {tournament.level && (
                <DetailRow
                  icon={Users}
                  label={t("level")}
                  value={tEnum(`level.${tournament.level}`)}
                />
              )}
              <DetailRow
                icon={Wallet}
                label={t("price")}
                value={tournament.price ? formatPriceValue(tournament.price, locale) : t("free")}
              />
              <DetailRow
                icon={UserIcon}
                label={t("organizer")}
                value={`${tournament.organizer.firstName} ${tournament.organizer.lastName}`}
              />
            </dl>

            {(socialLinks.length > 0 || tournament.email) && (
              <div className="mt-5 flex gap-2 border-t border-line pt-5">
                {socialLinks.map(({ key, href, label, Icon }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors hover:bg-brand-100"
                  >
                    <Icon width={16} height={16} />
                  </a>
                ))}
                {tournament.email && (
                  <a
                    href={`mailto:${tournament.email}`}
                    aria-label={t("emailLabel")}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition-colors hover:bg-brand-100"
                  >
                    <MailIcon size={16} />
                  </a>
                )}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold text-navy-900">{t("keyDates")}</h2>
            <ul className="mt-5 space-y-4">
              <KeyDate
                label={t("deadline")}
                date={tournament.registrationDeadline}
                locale={locale}
                highlight
              />
              <KeyDate label={t("startDate")} date={tournament.startDate} locale={locale} />
              {tournament.endDate && (
                <KeyDate label={t("endDate")} date={tournament.endDate} locale={locale} />
              )}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold text-navy-900">{t("organizer")}</h2>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-white">
                {tournament.organizer.firstName[0]}
                {tournament.organizer.lastName[0]}
              </div>
              <div>
                <p className="font-medium text-ink">
                  {tournament.organizer.firstName} {tournament.organizer.lastName}
                </p>
                {tournament.organizer.city && <p className="text-sm text-muted">{tournament.organizer.city}</p>}
              </div>
            </div>
            {tournament.organizer.email && (
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <a href={`mailto:${tournament.organizer.email}`}>
                  <MailIcon size={16} /> {t("contactOrganizer")}
                </a>
              </Button>
            )}
          </Card>
        </div>
      </Container>

      <Container className="pb-16">
        <CtaBanner
          icon={Trophy}
          title={t("ctaTitle")}
          description={t("ctaDescription", { title: tournament.title })}
        >
          {myRegistration ? (
            <Badge tone={REG_STATUS_TONE[myRegistration.status] ?? "gray"} className="bg-white px-4 py-2 text-sm">
              {tEnum(`regStatus.${myRegistration.status}`)}
            </Badge>
          ) : isExternal ? (
            open ? (
              <Button asChild size="lg" variant="secondary" className="bg-white text-navy-900 hover:bg-brand-50">
                <a href={tournament.externalUrl!} target="_blank" rel="noreferrer">
                  <ExternalLink size={18} /> {t("registerExternal")}
                </a>
              </Button>
            ) : (
              <Button size="lg" disabled variant="secondary" className="bg-white/50 text-navy-900">
                {t("registrationClosed")}
              </Button>
            )
          ) : open ? (
            <Button asChild size="lg" variant="secondary" className="bg-white text-navy-900 hover:bg-brand-50">
              <Link href={`/tournaments/${tournament.id}/register`}>{t("register")}</Link>
            </Button>
          ) : (
            <Button size="lg" disabled variant="secondary" className="bg-white/50 text-navy-900">
              {t("registrationClosed")}
            </Button>
          )}
        </CtaBanner>
      </Container>
    </>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={17} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
      <div>
        <dt className="text-muted">{label}</dt>
        <dd className="font-medium text-ink">{value}</dd>
      </div>
    </div>
  );
}

function KeyDate({
  label,
  date,
  locale,
  highlight,
}: {
  label: string;
  date: Date;
  locale: string;
  highlight?: boolean;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", highlight ? "bg-rose-500" : "bg-brand-500")}
        aria-hidden="true"
      />
      <div>
        <p className={cn("text-sm font-medium", highlight ? "text-rose-600" : "text-ink")}>{label}</p>
        <p className="text-sm text-muted">{formatDate(date, locale)}</p>
      </div>
    </li>
  );
}
