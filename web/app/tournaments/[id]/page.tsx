import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { InstagramIcon, TelegramIcon } from "@/components/icons/social";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CtaBanner } from "@/components/ui/cta-banner";
import { FavoriteButton } from "@/components/tournaments/favorite-button";
import { getTournamentDetail } from "@/lib/tournaments/queries";
import { requireUser } from "@/lib/auth/session";
import { getFavoriteTournamentIds } from "@/lib/actions/favorites";
import { getMyRegistrations } from "@/lib/profile/queries";
import { TournamentFormat, RegistrationType, parseLanguages } from "@/lib/enums";
import {
  FORMAT_LABEL,
  LEVEL_LABEL,
  LOCATION_TYPE_LABEL,
  REG_STATUS_LABEL,
  REG_STATUS_TONE,
  formatDateRu,
  formatPrice,
  isRegistrationOpen,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tournament = await getTournamentDetail(id);
  return { title: tournament?.title ?? "Турнир не найден" };
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await getTournamentDetail(id);
  if (!tournament) notFound();

  // requireUser, а не getCurrentUser: см. комментарий в app/tournaments/page.tsx —
  // proxy.ts судит по JWT и не знает про блокировку/удаление аккаунта в БД.
  const user = await requireUser(`/tournaments/${id}`);
  const [favoriteIds, myRegistrations] = await Promise.all([
    getFavoriteTournamentIds(user.id),
    getMyRegistrations(user.id),
  ]);
  const myRegistration = myRegistrations.find((r) => r.tournament.id === tournament.id);

  const open = isRegistrationOpen(tournament.registrationDeadline);
  const languages = parseLanguages(tournament.languages);
  const sectionsLabel = tournament.format === TournamentFormat.MUN ? "Комитеты" : "Разделы турнира";
  // Внешняя регистрация (spec §7): организатор указывает стороннюю ссылку
  // вместо формы платформы — CTA должен вести на неё, а не на
  // /tournaments/[id]/register (внутренняя форма для таких турниров вообще
  // недоступна, см. guard в register/page.tsx).
  const isExternal = tournament.registrationType === RegistrationType.EXTERNAL && Boolean(tournament.externalUrl);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-900">
        {tournament.coverImage ? (
          <>
            <Image
              src={tournament.coverImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-40"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/80 to-navy-900/60"
              aria-hidden="true"
            />
          </>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle,#ffffff_1.5px,transparent_1.5px)] [background-size:20px_20px]"
            aria-hidden="true"
          />
        )}
        <Container className="relative py-10 sm:py-14">
          <Breadcrumbs
            items={[
              { label: "Главная", href: "/" },
              { label: "Турниры", href: "/tournaments" },
              { label: tournament.title },
            ]}
            className="[&_a]:text-white/60 [&_a:hover]:text-white [&_span]:text-white"
          />

          <div className="mt-6 flex items-start justify-between gap-4">
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
                {open ? "Регистрация открыта" : "Регистрация завершена"}
              </Badge>
              <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
                {tournament.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={16} /> {formatDateRu(tournament.startDate)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={16} /> {tournament.city ?? "Онлайн"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Globe size={16} /> {LOCATION_TYPE_LABEL[tournament.locationType] ?? tournament.locationType}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone="blue">{FORMAT_LABEL[tournament.format] ?? tournament.format}</Badge>
                {tournament.level && <Badge tone="purple">{LEVEL_LABEL[tournament.level]}</Badge>}
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
                {REG_STATUS_LABEL[myRegistration.status] ?? myRegistration.status}
              </Badge>
            ) : isExternal ? (
              open ? (
                <Button asChild size="lg">
                  <a href={tournament.externalUrl!} target="_blank" rel="noreferrer">
                    <ExternalLink size={18} /> Регистрация на сайте организатора
                  </a>
                </Button>
              ) : (
                <Button size="lg" disabled>
                  Регистрация завершена
                </Button>
              )
            ) : open ? (
              <Button asChild size="lg">
                <Link href={`/tournaments/${tournament.id}/register`}>Зарегистрироваться</Link>
              </Button>
            ) : (
              <Button size="lg" disabled>
                Регистрация завершена
              </Button>
            )}
          </div>
        </Container>
      </section>

      <Container className="grid gap-8 py-10 lg:grid-cols-3 lg:py-14">
        {/* Основной контент */}
        <div className="space-y-8 lg:col-span-2">
          <Card className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-navy-900">О турнире</h2>
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
            <h2 className="text-lg font-bold text-navy-900">Детали турнира</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <DetailRow icon={Globe} label="Формат" value={FORMAT_LABEL[tournament.format] ?? tournament.format} />
              <DetailRow icon={Calendar} label="Дата проведения" value={formatDateRu(tournament.startDate)} />
              <DetailRow
                icon={Calendar}
                label="Дедлайн регистрации"
                value={formatDateRu(tournament.registrationDeadline)}
              />
              <DetailRow
                icon={MapPin}
                label="Место проведения"
                value={tournament.venue ?? tournament.address ?? tournament.city ?? "Онлайн"}
              />
              <DetailRow icon={Languages} label="Язык" value={languages.join(", ") || "—"} />
              {tournament.level && (
                <DetailRow icon={Users} label="Уровень" value={LEVEL_LABEL[tournament.level] ?? tournament.level} />
              )}
              <DetailRow icon={Wallet} label="Стоимость" value={formatPrice(tournament.price)} />
              <DetailRow
                icon={UserIcon}
                label="Организатор"
                value={`${tournament.organizer.firstName} ${tournament.organizer.lastName}`}
              />
            </dl>

            {(tournament.instagram || tournament.telegram || tournament.email) && (
              <div className="mt-5 flex gap-2 border-t border-line pt-5">
                {tournament.instagram && (
                  <a
                    href={tournament.instagram}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Instagram организатора"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100"
                  >
                    <InstagramIcon width={16} height={16} />
                  </a>
                )}
                {tournament.telegram && (
                  <a
                    href={tournament.telegram}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Telegram организатора"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100"
                  >
                    <TelegramIcon width={16} height={16} />
                  </a>
                )}
                {tournament.email && (
                  <a
                    href={`mailto:${tournament.email}`}
                    aria-label="Написать организатору"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100"
                  >
                    <MailIcon size={16} />
                  </a>
                )}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold text-navy-900">Ключевые даты</h2>
            <ul className="mt-5 space-y-4">
              <KeyDate label="Дедлайн регистрации" date={tournament.registrationDeadline} highlight />
              <KeyDate label="Дата проведения" date={tournament.startDate} />
              {tournament.endDate && <KeyDate label="Окончание" date={tournament.endDate} />}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-bold text-navy-900">Организатор</h2>
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
                  <MailIcon size={16} /> Связаться с организатором
                </a>
              </Button>
            )}
          </Card>
        </div>
      </Container>

      <Container className="pb-16">
        <CtaBanner
          icon={Trophy}
          title="Готовы принять участие?"
          description={`Присоединяйтесь к «${tournament.title}» и станьте частью сообщества!`}
        >
          {myRegistration ? (
            <Badge tone={REG_STATUS_TONE[myRegistration.status] ?? "gray"} className="bg-white px-4 py-2 text-sm">
              {REG_STATUS_LABEL[myRegistration.status] ?? myRegistration.status}
            </Badge>
          ) : isExternal ? (
            open ? (
              <Button asChild size="lg" variant="secondary" className="bg-white text-navy-900 hover:bg-brand-50">
                <a href={tournament.externalUrl!} target="_blank" rel="noreferrer">
                  <ExternalLink size={18} /> Регистрация на сайте организатора
                </a>
              </Button>
            ) : (
              <Button size="lg" disabled variant="secondary" className="bg-white/50 text-navy-900">
                Регистрация завершена
              </Button>
            )
          ) : open ? (
            <Button asChild size="lg" variant="secondary" className="bg-white text-navy-900 hover:bg-brand-50">
              <Link href={`/tournaments/${tournament.id}/register`}>Зарегистрироваться</Link>
            </Button>
          ) : (
            <Button size="lg" disabled variant="secondary" className="bg-white/50 text-navy-900">
              Регистрация завершена
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

function KeyDate({ label, date, highlight }: { label: string; date: Date; highlight?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", highlight ? "bg-rose-500" : "bg-brand-500")}
        aria-hidden="true"
      />
      <div>
        <p className={cn("text-sm font-medium", highlight ? "text-rose-600" : "text-ink")}>{label}</p>
        <p className="text-sm text-muted">{formatDateRu(date)}</p>
      </div>
    </li>
  );
}
