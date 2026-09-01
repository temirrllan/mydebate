import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Calendar, MapPin, Globe, Clock, Wallet, Info } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getTournamentDetail } from "@/lib/tournaments/queries";
import { getMyRegistrations } from "@/lib/profile/queries";
import { requireUser } from "@/lib/auth/session";
import { RegistrationType, TournamentFormat, parseLanguages } from "@/lib/enums";
import { formatDate, formatPriceValue, isRegistrationOpen } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { RegisterForm } from "./register-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const tournament = await getTournamentDetail(id);
  const t = await getTranslations({ locale, namespace: "registration" });
  return {
    title: tournament
      ? t("metaTitle", { title: tournament.title })
      : t("metaTitleFallback"),
  };
}

export default async function TournamentRegisterPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const user = await requireUser(`/tournaments/${id}/register`);

  const t = await getTranslations("registration");
  const tNav = await getTranslations("nav");
  const tCommon = await getTranslations("common");
  const tEnum = await getTranslations("enums");
  const tCard = await getTranslations("tournamentCard");
  const tTournament = await getTranslations("tournament");

  const tournament = await getTournamentDetail(id);
  if (!tournament) notFound();

  // Турниры с внешней регистрацией не имеют внутренней формы — организатор
  // указал стороннюю ссылку (Tournament.externalUrl), и CTA на странице
  // турнира ведёт прямо туда. Если кто-то всё же попадёт на этот маршрут
  // вручную (закладка, старая ссылка), отправляем обратно на страницу
  // турнира, где показан правильный CTA.
  if (tournament.registrationType === RegistrationType.EXTERNAL && tournament.externalUrl) {
    redirect(`/tournaments/${id}`);
  }

  const [myRegistrations, profileFields] = await Promise.all([
    getMyRegistrations(user.id),
    prisma.user.findUnique({ where: { id: user.id }, select: { phone: true } }),
  ]);
  const alreadyRegistered = myRegistrations.some((r) => r.tournament.id === id);
  const open = isRegistrationOpen(tournament.registrationDeadline);

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { label: tNav("home"), href: "/" },
          { label: tNav("tournaments"), href: "/tournaments" },
          { label: tournament.title, href: `/tournaments/${tournament.id}` },
          { label: t("breadcrumb") },
        ]}
      />

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
        {t("pageTitle")}
      </h1>

      {!open && !alreadyRegistered ? (
        <div className="mt-8">
          <EmptyState
            icon={Clock}
            title={t("closedTitle")}
            description={t("closedDescription")}
            action={
              <Button asChild>
                <Link href={`/tournaments/${tournament.id}`}>{t("toTournament")}</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <RegisterForm
            tournamentId={tournament.id}
            tournamentTitle={tournament.title}
            languages={parseLanguages(tournament.languages)}
            // Комитеты MUN — те же «Разделы турнира», которые организатор
            // завёл при создании (getTournamentDetail отдаёт их уже
            // отсортированными по order). Описание идёт вместе с названием:
            // форма показывает его прямо в карточке выбора, чтобы участник не
            // уходил читать повестку обратно на страницу турнира.
            committees={tournament.sections.map((s) => ({
              title: s.title,
              description: s.description,
            }))}
            defaultFullName={`${user.firstName} ${user.lastName}`.trim()}
            defaultEmail={user.email}
            defaultPhone={profileFields?.phone ?? ""}
            alreadyRegistered={alreadyRegistered}
            isMun={tournament.format === TournamentFormat.MUN}
            // Блок оплаты нужен только платному турниру, у которого ЕСТЬ
            // реквизиты. Турниры, созданные до появления этого поля, платные,
            // но переводить некуда — показывать пустой блок и требовать чек
            // значило бы закрыть им регистрацию совсем.
            payment={
              tournament.price > 0 && tournament.paymentAccount
                ? {
                    price: tournament.price,
                    method: tournament.paymentMethod,
                    account: tournament.paymentAccount,
                    recipient: tournament.paymentRecipient,
                  }
                : null
            }
          />

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <Card className="overflow-hidden">
              <div className="relative h-32 overflow-hidden bg-gradient-to-br from-navy-800 to-brand-600">
                <div
                  className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle,#ffffff_1.5px,transparent_1.5px)] [background-size:16px_16px]"
                  aria-hidden="true"
                />
              </div>
              <div className="p-5">
                <h2 className="font-bold text-navy-900">{tournament.title}</h2>
                <div className="mt-3 space-y-2 text-sm text-muted">
                  <p className="inline-flex items-center gap-1.5">
                    <Calendar size={15} className="text-brand-600" /> {formatDate(tournament.startDate, locale)}
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <MapPin size={15} className="text-brand-600" /> {tournament.city ?? tCommon("online")}
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <Globe size={15} className="text-brand-600" />
                    {t("asideFormat", {
                      format: tEnum(`format.${tournament.format}`),
                      locationType: tEnum(`locationType.${tournament.locationType}`),
                    })}
                  </p>
                </div>
                <Badge tone="green" className="mt-4">
                  {tCard("registrationOpen")}
                </Badge>
              </div>
            </Card>

            <Card className="p-5">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="inline-flex items-center gap-1.5 text-muted">
                    <Clock size={15} /> {t("asideDeadline")}
                  </dt>
                  <dd className="font-medium text-ink">{formatDate(tournament.registrationDeadline, locale)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="inline-flex items-center gap-1.5 text-muted">
                    <Wallet size={15} /> {t("asidePrice")}
                  </dt>
                  <dd className="font-medium text-ink">
                    {tournament.price
                      ? formatPriceValue(tournament.price, locale)
                      : tTournament("free")}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card className="flex gap-3 bg-brand-50/60 p-5">
              <Info size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <p className="text-sm text-muted">
                {t("asideNote")}
              </p>
            </Card>
          </aside>
        </div>
      )}
    </Container>
  );
}
