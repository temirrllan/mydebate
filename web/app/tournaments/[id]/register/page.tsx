import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Calendar, MapPin, Globe, Clock, Wallet, Info } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getTournamentDetail } from "@/lib/tournaments/queries";
import { getMyRegistrations } from "@/lib/profile/queries";
import { requireUser } from "@/lib/auth/session";
import { RegistrationType, parseLanguages } from "@/lib/enums";
import { FORMAT_LABEL, LOCATION_TYPE_LABEL, formatDateRu, formatPrice, isRegistrationOpen } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { RegisterForm } from "./register-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tournament = await getTournamentDetail(id);
  return { title: tournament ? `Регистрация · ${tournament.title}` : "Регистрация на турнир" };
}

export default async function TournamentRegisterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/tournaments/${id}/register`);

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
          { label: "Главная", href: "/" },
          { label: "Турниры", href: "/tournaments" },
          { label: tournament.title, href: `/tournaments/${tournament.id}` },
          { label: "Регистрация" },
        ]}
      />

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
        Регистрация на турнир
      </h1>

      {!open && !alreadyRegistered ? (
        <div className="mt-8">
          <EmptyState
            icon={Clock}
            title="Регистрация завершена."
            description="Дедлайн регистрации на этот турнир уже прошёл."
            action={
              <Button asChild>
                <Link href={`/tournaments/${tournament.id}`}>К турниру</Link>
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
            defaultFullName={`${user.firstName} ${user.lastName}`.trim()}
            defaultEmail={user.email}
            defaultPhone={profileFields?.phone ?? ""}
            alreadyRegistered={alreadyRegistered}
            // Блок оплаты нужен только платному турниру. Внешняя регистрация
            // сюда не доходит — выше стоит redirect на страницу турнира.
            payment={
              tournament.price > 0
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
                    <Calendar size={15} className="text-brand-600" /> {formatDateRu(tournament.startDate)}
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <MapPin size={15} className="text-brand-600" /> {tournament.city ?? "Онлайн"}
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <Globe size={15} className="text-brand-600" />
                    Формат: {FORMAT_LABEL[tournament.format] ?? tournament.format} ·{" "}
                    {LOCATION_TYPE_LABEL[tournament.locationType] ?? tournament.locationType}
                  </p>
                </div>
                <Badge tone="green" className="mt-4">
                  Регистрация открыта
                </Badge>
              </div>
            </Card>

            <Card className="p-5">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="inline-flex items-center gap-1.5 text-muted">
                    <Clock size={15} /> Дедлайн регистрации
                  </dt>
                  <dd className="font-medium text-ink">{formatDateRu(tournament.registrationDeadline)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="inline-flex items-center gap-1.5 text-muted">
                    <Wallet size={15} /> Стоимость участия
                  </dt>
                  <dd className="font-medium text-ink">{formatPrice(tournament.price)}</dd>
                </div>
              </dl>
            </Card>

            <Card className="flex gap-3 bg-brand-50/60 p-5">
              <Info size={18} className="mt-0.5 shrink-0 text-brand-600" />
              <p className="text-sm text-muted">
                После отправки заявки организаторы рассмотрят вашу регистрацию и свяжутся с вами при
                необходимости.
              </p>
            </Card>
          </aside>
        </div>
      )}
    </Container>
  );
}
