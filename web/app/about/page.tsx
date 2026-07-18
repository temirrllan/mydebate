import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus, Users, Calendar, ShieldCheck, Rocket, Globe2, Trophy } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IllustrationPanel } from "@/components/ui/illustration-panel";
import { FeatureCard } from "@/components/ui/feature-card";
import { CtaBanner } from "@/components/ui/cta-banner";

export const metadata: Metadata = { title: "О нас" };

const MISSION_ITEMS = [
  {
    icon: Users,
    title: "Объединяем участников",
    description: "Создаём комьюнити для дебатёров и делегатов по всему Казахстану.",
  },
  {
    icon: Calendar,
    title: "Упрощаем поиск",
    description: "Все актуальные турниры и конференции в одном месте.",
  },
  {
    icon: ShieldCheck,
    title: "Повышаем качество",
    description: "Поддерживаем развитие культуры дебатов и MUN в стране.",
  },
  {
    icon: Rocket,
    title: "Развиваем возможности",
    description: "Помогаем организаторам проводить качественные мероприятия.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-white">
        <Container className="grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <Badge tone="blue" className="mb-5">
              О ПРОЕКТЕ
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-5xl">
              О проекте MyDebate
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              MyDebate — это платформа, созданная для развития дебатного
              движения и Model United Nations в Казахстане. Мы объединяем
              участников, организаторов и турниры в одном месте, делая процесс
              поиска и участия в событиях простым и удобным.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/tournaments">
                  Смотреть турниры <ArrowRight size={18} />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/tournaments/create">
                  Создать турнир <Plus size={18} />
                </Link>
              </Button>
            </div>
          </div>

          <IllustrationPanel icon={Globe2} variant="light" />
        </Container>
      </section>

      {/* Наша миссия */}
      <section className="border-t border-line bg-canvas">
        <Container className="py-16 text-center lg:py-20">
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">Наша миссия</h2>
          <span className="mx-auto mt-3 block h-1 w-14 rounded-full bg-brand-600" aria-hidden="true" />
          <p className="mx-auto mt-6 max-w-2xl text-muted">
            Мы стремимся сделать дебаты и MUN доступнее для каждого, создавая
            единую экосистему для обмена знаниями, опытом и возможностями.
          </p>

          <div className="mt-12 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
            {MISSION_ITEMS.map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <Container className="py-16 lg:py-20">
          <CtaBanner
            icon={Trophy}
            title="Присоединяйтесь к сообществу MyDebate"
            description="Участвуйте в турнирах, создавайте события и развивайте дебатное движение вместе с нами!"
          >
            <Button asChild variant="secondary" className="bg-white text-navy-900 hover:bg-brand-50">
              <Link href="/tournaments">
                Смотреть турниры <ArrowRight size={18} />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/tournaments/create">
                Создать турнир <Plus size={18} />
              </Link>
            </Button>
          </CtaBanner>
        </Container>
      </section>
    </>
  );
}
