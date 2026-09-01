import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, CalendarSearch, Heart, ShieldAlert, Plus, Trophy } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { FavoriteButton } from "@/components/tournaments/favorite-button";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileSidebar, type ProfileTab } from "@/components/profile/profile-sidebar";
import { RegistrationRow } from "@/components/profile/registration-row";
import { CancelRegistrationButton } from "@/components/profile/cancel-registration-button";
import { NotificationsPanel } from "@/components/profile/notifications-panel";
import { MyTournamentRow } from "@/components/profile/my-tournament-row";
import { SettingsForm } from "@/components/profile/settings-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { requireUser } from "@/lib/auth/session";
import { getProfileDashboard, getMyRegistrations } from "@/lib/profile/queries";
import { listMyTournaments, type MyTournamentItem } from "@/lib/tournaments/queries";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { parseLanguages } from "@/lib/enums";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profile" });
  return { title: t("metaTitle") };
}

const TAB_IDS: ProfileTab[] = [
  "overview",
  "tournaments",
  "applications",
  "favorites",
  "notifications",
  "settings",
];

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser("/profile");
  const { tab: rawTab } = await searchParams;
  const tab: ProfileTab = TAB_IDS.includes(rawTab as ProfileTab) ? (rawTab as ProfileTab) : "overview";

  // Поля профиля (bio/city/phone/уровень/языки) не входят в CurrentUser
  // (lib/auth/session.ts отдаёт только базовый набор для сессии/навбара) —
  // дочитываем их здесь напрямую, по аналогии с прямым prisma-запросом на
  // Главной странице (app/page.tsx) для данных, не покрытых общим хелпером.
  const [profileFields, dashboard] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        phone: true,
        city: true,
        bio: true,
        school: true,
        major: true,
        experience: true,
        level: true,
        languages: true,
      },
    }),
    getProfileDashboard(user.id),
  ]);

  const t = await getTranslations("profile");

  const myApplications = tab === "applications" ? await getMyRegistrations(user.id) : null;
  const myTournaments = tab === "tournaments" ? await listMyTournaments(user.id) : null;

  return (
    <Container className="py-10 sm:py-14">
      <ProfileHeader
        user={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: profileFields?.phone ?? null,
          city: profileFields?.city ?? null,
          bio: profileFields?.bio ?? null,
          image: user.image,
          role: user.role,
        }}
        stats={{
          registrations: dashboard.upcoming.length + dashboard.past.length,
          favorites: dashboard.favorites.length,
          unreadNotifications: dashboard.unreadNotificationCount,
        }}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <ProfileSidebar active={tab} unreadNotificationCount={dashboard.unreadNotificationCount} />

        <div className="min-w-0">
          {tab === "overview" && (
            <OverviewTab dashboard={dashboard} profileFields={profileFields} />
          )}
          {tab === "tournaments" && (
            <TournamentsTab dashboard={dashboard} myTournaments={myTournaments ?? []} />
          )}
          {tab === "applications" && <ApplicationsTab registrations={myApplications ?? []} />}
          {tab === "favorites" && <FavoritesTab dashboard={dashboard} />}
          {tab === "notifications" && (
            <Card className="p-6 sm:p-8">
              <h2 className="text-lg font-bold text-navy-900">{t("notifications")}</h2>
              <div className="mt-5">
                <NotificationsPanel notifications={dashboard.notifications} />
              </div>
            </Card>
          )}
          {tab === "settings" && (
            <SettingsTab
              user={user}
              profileFields={profileFields}
            />
          )}
        </div>
      </div>
    </Container>
  );
}

type Dashboard = Awaited<ReturnType<typeof getProfileDashboard>>;

async function OverviewTab({
  dashboard,
  profileFields,
}: {
  dashboard: Dashboard;
  profileFields: {
    city: string | null;
    bio: string | null;
    school: string | null;
    major: string | null;
    experience: string | null;
    level: string | null;
    languages: string | null;
  } | null;
}) {
  const t = await getTranslations("profile");
  const tEnum = await getTranslations("enums");
  const locale = await getLocale();
  const languages = parseLanguages(profileFields?.languages);

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 className="text-lg font-bold text-navy-900">{t("upcoming")}</h2>
            {dashboard.upcoming.length > 0 && (
              <Link
                href="/profile?tab=tournaments"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {t("viewAll")} <ArrowRight size={15} />
              </Link>
            )}
          </div>
          <div className="mt-2">
            {dashboard.upcoming.length === 0 ? (
              <EmptyState
                className="mt-4"
                icon={CalendarSearch}
                title={t("noUpcoming")}
                description={t("noUpcomingText")}
                action={
                  <Button asChild size="sm">
                    <Link href="/tournaments">{t("toTournaments")}</Link>
                  </Button>
                }
              />
            ) : (
              dashboard.upcoming.slice(0, 3).map((r) => <RegistrationRow key={r.id} registration={r} />)
            )}
          </div>
        </Card>

        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 className="text-lg font-bold text-navy-900">{t("past")}</h2>
            {dashboard.past.length > 0 && (
              <Link
                href="/profile?tab=tournaments"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {t("viewAll")} <ArrowRight size={15} />
              </Link>
            )}
          </div>
          <div className="mt-2">
            {dashboard.past.length === 0 ? (
              <EmptyState className="mt-4" icon={CalendarSearch} title={t("noPast")} />
            ) : (
              dashboard.past.slice(0, 3).map((r) => <RegistrationRow key={r.id} registration={r} />)
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-navy-900">{t("about")}</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {profileFields?.level && (
              <Row label={t("level")} value={tEnum(`level.${profileFields.level}`)} />
            )}
            {languages.length > 0 && <Row label={t("language")} value={languages.join(", ")} />}
            {profileFields?.experience && <Row label={t("experience")} value={profileFields.experience} />}
            {profileFields?.school && <Row label={t("school")} value={profileFields.school} />}
            {profileFields?.major && <Row label={t("major")} value={profileFields.major} />}
            {!profileFields?.level &&
              languages.length === 0 &&
              !profileFields?.experience &&
              !profileFields?.school &&
              !profileFields?.major && <p className="text-muted">{t("aboutEmpty")}</p>}
          </dl>
          {profileFields?.bio && (
            <>
              <p className="mt-4 text-sm font-medium text-ink">{t("about")}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{profileFields.bio}</p>
            </>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <h2 className="text-lg font-bold text-navy-900">{t("favorites")}</h2>
            {dashboard.favorites.length > 0 && (
              <Link
                href="/profile?tab=favorites"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {t("viewAll")} <ArrowRight size={15} />
              </Link>
            )}
          </div>
          {dashboard.favorites.length === 0 ? (
            <EmptyState className="mt-4" icon={Heart} title={t("noFavorites")} />
          ) : (
            <ul className="mt-3 space-y-3">
              {dashboard.favorites.slice(0, 3).map((f) => (
                <li key={f.favoriteId}>
                  <Link
                    href={`/tournaments/${f.tournament.id}`}
                    className="flex items-center gap-3 rounded-lg p-1.5 hover:bg-canvas"
                  >
                    <div className="h-11 w-14 shrink-0 rounded-md bg-gradient-to-br from-navy-800 to-brand-600" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{f.tournament.title}</p>
                      <p className="text-xs text-muted">
                        {formatDate(f.tournament.startDate, locale)}
                        {f.tournament.city ? `, ${f.tournament.city}` : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

async function TournamentsTab({
  dashboard,
  myTournaments,
}: {
  dashboard: Dashboard;
  myTournaments: MyTournamentItem[];
}) {
  const t = await getTranslations("profile");
  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-navy-900">{t("organizing")}</h2>
          <Button asChild size="sm">
            <Link href="/tournaments/create">
              <Plus size={16} /> {t("createTournament")}
            </Link>
          </Button>
        </div>
        <div className="mt-2">
          {myTournaments.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={Trophy}
              title={t("noOrganized")}
              description={t("noOrganizedText")}
              action={
                <Button asChild size="sm">
                  <Link href="/tournaments/create">{t("createTournament")}</Link>
                </Button>
              }
            />
          ) : (
            myTournaments.map((t) => <MyTournamentRow key={t.id} tournament={t} />)
          )}
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-navy-900">{t("participating")}</h2>
        <p className="mt-1 text-sm text-muted">{t("upcoming")}</p>
        <div className="mt-2">
          {dashboard.upcoming.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={CalendarSearch}
              title={t("noUpcoming")}
              description={t("noUpcomingText")}
              action={
                <Button asChild size="sm">
                  <Link href="/tournaments">{t("toTournaments")}</Link>
                </Button>
              }
            />
          ) : (
            dashboard.upcoming.map((r) => <RegistrationRow key={r.id} registration={r} />)
          )}
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-navy-900">{t("past")}</h2>
        <div className="mt-2">
          {dashboard.past.length === 0 ? (
            <EmptyState className="mt-4" icon={CalendarSearch} title={t("noPast")} />
          ) : (
            dashboard.past.map((r) => <RegistrationRow key={r.id} registration={r} />)
          )}
        </div>
      </Card>
    </div>
  );
}

async function ApplicationsTab({ registrations }: { registrations: Dashboard["upcoming"] }) {
  const t = await getTranslations("profile");

  return (
    <Card className="p-6 sm:p-8">
      <h2 className="text-lg font-bold text-navy-900">{t("applications")}</h2>
      <div className="mt-2">
        {registrations.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={CalendarSearch}
            title={t("noApplications")}
            description={t("noApplicationsText")}
            action={
              <Button asChild size="sm">
                <Link href="/tournaments">{t("toTournaments")}</Link>
              </Button>
            }
          />
        ) : (
          registrations.map((r) => (
            <RegistrationRow
              key={r.id}
              registration={r}
              action={
                new Date(r.tournament.startDate) > new Date() ? (
                  <CancelRegistrationButton tournamentId={r.tournament.id} />
                ) : undefined
              }
            />
          ))
        )}
      </div>
    </Card>
  );
}

async function FavoritesTab({ dashboard }: { dashboard: Dashboard }) {
  const t = await getTranslations("profile");

  if (dashboard.favorites.length === 0) {
    return (
      <Card className="p-6 sm:p-8">
        <EmptyState
          icon={Heart}
          title={t("noFavorites")}
          description={t("noFavoritesText")}
          action={
            <Button asChild size="sm">
              <Link href="/tournaments">{t("toTournaments")}</Link>
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
      {dashboard.favorites.map((f) => (
        <TournamentCard
          key={f.favoriteId}
          tournament={f.tournament}
          favoriteSlot={<FavoriteButton tournamentId={f.tournament.id} initialFavorited />}
        />
      ))}
    </div>
  );
}

async function SettingsTab({
  user,
  profileFields,
}: {
  user: { firstName: string; lastName: string; email: string; role: string };
  profileFields: {
    phone: string | null;
    city: string | null;
    bio: string | null;
    school: string | null;
    major: string | null;
    experience: string | null;
    level: string | null;
    languages: string | null;
  } | null;
}) {
  const t = await getTranslations("profile");
  const initial = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: profileFields?.phone ?? "",
    city: profileFields?.city ?? "",
    school: profileFields?.school ?? "",
    major: profileFields?.major ?? "",
    experience: profileFields?.experience ?? "",
    bio: profileFields?.bio ?? "",
    level: profileFields?.level ?? "",
    languages: profileFields?.languages ?? "",
  };

  return (
    <div className="space-y-6">
      <SettingsForm initial={initial} />

      <ChangePasswordForm />

      {user.role !== "ADMIN" && (
        <Card className="flex gap-3 p-5">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-muted" />
          <p className="text-sm text-muted">
            {t("organizerHint")}
          </p>
        </Card>
      )}
    </div>
  );
}
