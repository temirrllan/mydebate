import Link from "next/link";
import {
  ArrowRight,
  Plus,
  Globe,
  Calendar,
  Search,
  Rocket,
  FileText,
  UserPlus,
  Presentation,
  Trophy,
  CalendarSearch,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IllustrationPanel } from "@/components/ui/illustration-panel";
import { FeatureCard } from "@/components/ui/feature-card";
import { CtaBanner } from "@/components/ui/cta-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { prisma } from "@/lib/prisma";
import { TournamentStatus } from "@/lib/enums";

const ADVANTAGES = [
  {
    icon: Globe,
    title: "Централизованный доступ к турнирам",
    description: "Все актуальные события собраны в одном месте.",
  },
  {
    icon: Calendar,
    title: "Актуальность информации",
    description: "Платформа отображает только действующие и проверенные мероприятия.",
  },
  {
    icon: Search,
    title: "Удобная система поиска",
    description: "Фильтрация по городу, формату и дате проведения.",
  },
  {
    icon: Rocket,
    title: "Быстрый доступ к регистрации",
    description: "Переход к участию в несколько кликов.",
  },
];

const STEPS = [
  {
    icon: Search,
    title: "Выберите подходящий турнир или конференцию",
  },
  {
    icon: FileText,
    title: "Ознакомьтесь с деталями мероприятия",
  },
  {
    icon: UserPlus,
    title: "Перейдите к регистрации и подайте заявку",
  },
];

export default async function Home() {
  // Только опубликованные турниры, ближайшие по дате начала (spec: гости
  // видят лендинг, но каталог турниров и деталь турнира auth-gated — эти три
  // карточки на главной остаются публичными "витринными" данными).
  const upcomingTournaments = await prisma.tournament.findMany({
    where: {
      status: TournamentStatus.PUBLISHED,
      startDate: { gte: new Date() },
    },
    orderBy: { startDate: "asc" },
    take: 3,
    select: {
      id: true,
      title: true,
      city: true,
      startDate: true,
      registrationDeadline: true,
      format: true,
      level: true,
      coverImage: true,
    },
  });

  return (
    <>
      {/* 1. Hero */}
      <section className="relative overflow-hidden bg-white">
        <div
          className="pointer-events-none absolute right-0 top-10 hidden h-40 w-40 opacity-60 lg:block [background-image:radial-gradient(circle,var(--color-brand-300)_1.5px,transparent_1.5px)] [background-size:16px_16px]"
          aria-hidden="true"
        />
        <Container className="grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <Badge tone="blue" className="mb-5">
              #1 Платформа дебатов и MUN в Казахстане
            </Badge>
            <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-5xl">
              Найди дебатные турниры и MUN{" "}
              <span className="text-brand-600">конференции</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">
              Все актуальные события на одной платформе — быстро найди и
              зарегистрируйся.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/tournaments">
                  Смотреть турниры <ArrowRight size={18} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/tournaments/create">
                  Разместить турнир <Plus size={18} />
                </Link>
              </Button>
            </div>
          </div>

          <IllustrationPanel icon={Presentation} variant="dark" className="lg:aspect-[5/4]" />
        </Container>
      </section>

      {/* 2. Ближайшие турниры */}
      <section className="border-t border-line bg-canvas">
        <Container className="py-16 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">
              Ближайшие турниры
            </h2>
            <Link
              href="/tournaments"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Смотреть все турниры <ArrowRight size={16} />
            </Link>
          </div>

          {upcomingTournaments.length === 0 ? (
            <EmptyState
              className="mt-8"
              icon={CalendarSearch}
              title="Пока нет опубликованных турниров."
              description="Загляните позже — новые турниры и конференции появляются регулярно."
            />
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          )}
        </Container>
      </section>

      {/* 3. О платформе MyDebate */}
      <section className="bg-brand-50/60">
        <Container className="grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-white to-brand-100/70 order-2 lg:order-1">
            <div
              className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle,var(--color-brand-300)_1.5px,transparent_1.5px)] [background-size:22px_22px]"
              aria-hidden="true"
            />
            <div className="relative flex flex-col items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-navy-900 text-4xl font-black text-white shadow-xl shadow-navy-900/20 sm:h-28 sm:w-28 sm:text-5xl">
                M
              </div>
              <div className="h-4 w-40 rounded-full bg-brand-200/70 blur-[2px]" aria-hidden="true" />
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">
              О платформе MyDebate
            </h2>
            <div className="mt-5 space-y-4 text-muted">
              <p>
                MyDebate — это централизованная платформа, созданная для
                участников дебатного движения и Model United Nations.
              </p>
              <p>
                Сервис решает проблему разрозненности информации, объединяя
                турниры, конференции и образовательные мероприятия в одном
                месте.
              </p>
              <p>
                Пользователи получают возможность быстро находить подходящие
                события, сравнивать их и принимать решение об участии без
                необходимости поиска в чатах и социальных сетях.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* 4. Преимущества платформы */}
      <section className="bg-white">
        <Container className="py-16 lg:py-20">
          <h2 className="text-center text-2xl font-bold text-navy-900 sm:text-3xl">
            Преимущества платформы
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ADVANTAGES.map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>
        </Container>
      </section>

      {/* 5. Как работает платформа */}
      <section className="border-t border-line bg-canvas">
        <Container className="py-16 lg:py-20">
          <h2 className="text-center text-2xl font-bold text-navy-900 sm:text-3xl">
            Как работает платформа
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && (
                  <div
                    className="absolute left-1/2 top-6 hidden h-px w-full border-t border-dashed border-brand-300 sm:block"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-base font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm ring-1 ring-line">
                    <step.icon size={22} />
                  </span>
                </div>
                <p className="relative mt-4 max-w-[15rem] font-medium text-ink">
                  {step.title}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 6. CTA */}
      <section className="bg-white">
        <Container className="py-16 lg:py-20">
          <CtaBanner
            icon={Trophy}
            title="Начните поиск турнира уже сейчас"
            description="Присоединяйтесь к дебатному сообществу и развивайте свои навыки!"
          >
            <Button asChild size="lg" variant="secondary" className="bg-white text-navy-900 hover:bg-brand-50">
              <Link href="/tournaments">
                Смотреть турниры <ArrowRight size={18} />
              </Link>
            </Button>
          </CtaBanner>
        </Container>
      </section>
    </>
  );
}
