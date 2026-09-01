import type { Metadata } from "next";
import { Headphones, Phone, Mail, Target, Landmark, Users } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { IllustrationPanel } from "@/components/ui/illustration-panel";
import { ContactCard } from "@/components/contact-card";
import { InstagramIcon, TelegramIcon } from "@/components/icons/social";
import { ContactForm } from "@/components/support/contact-form";
import { getCurrentUser } from "@/lib/auth/session";
import { SITE_CONTACTS } from "@/lib/site";

export const metadata: Metadata = { title: "Контакты" };

const MINI_CARDS = [
  {
    icon: Target,
    title: "Для участников",
    description: "Находите турниры и MUN-конференции в одном месте.",
  },
  {
    icon: Landmark,
    title: "Для организаторов",
    description: "Публикуйте мероприятия и привлекайте аудиторию.",
  },
  {
    icon: Users,
    title: "Для сообщества",
    description: "Развивайте дебатную культуру и академические инициативы.",
  },
];

export default async function ContactsPage() {
  // Страница остаётся публичной (гость тоже может написать в поддержку,
  // см. lib/actions/support.ts) — getCurrentUser() здесь используется только
  // для преднаполнения формы, а не для гейта доступа.
  const user = await getCurrentUser();

  return (
    <>
      <section className="bg-white">
        <Container className="py-10 lg:py-14">
          <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Контакты" }]} className="mb-8" />

          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge tone="blue" className="mb-5">
                Мы на связи
              </Badge>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-5xl">
                Свяжитесь с нами
              </h1>
              <p className="mt-5 max-w-lg text-lg text-muted">
                Есть вопросы, предложения по сотрудничеству или нужна помощь?
                Свяжитесь с нами любым удобным способом.
              </p>
            </div>
            <IllustrationPanel icon={Headphones} variant="light" />
          </div>
        </Container>
      </section>

      <section className="border-t border-line bg-white">
        <Container className="py-14">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ContactCard
              icon={Phone}
              label="Телефон"
              value={SITE_CONTACTS.phone.display}
              action={
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href={SITE_CONTACTS.phone.href}>
                    <Phone size={16} /> Позвонить
                  </a>
                </Button>
              }
            />
            <ContactCard
              icon={Mail}
              label="Email"
              value={SITE_CONTACTS.email}
              action={
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href={`mailto:${SITE_CONTACTS.email}`}>
                    <Mail size={16} /> Написать письмо
                  </a>
                </Button>
              }
            />
            <ContactCard
              icon={InstagramIcon}
              label="Instagram"
              value={SITE_CONTACTS.instagram.handle}
              action={
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href={SITE_CONTACTS.instagram.url} target="_blank" rel="noreferrer">
                    Перейти в Instagram
                  </a>
                </Button>
              }
            />
            <ContactCard
              icon={TelegramIcon}
              label="Telegram"
              value={SITE_CONTACTS.telegram.handle}
              action={
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href={SITE_CONTACTS.telegram.url} target="_blank" rel="noreferrer">
                    Перейти в Telegram
                  </a>
                </Button>
              }
            />
          </div>
        </Container>
      </section>

      <section className="border-t border-line bg-canvas">
        <Container className="py-14 lg:py-16">
          <div className="mx-auto max-w-2xl">
            <ContactForm
              defaultName={user ? `${user.firstName} ${user.lastName}`.trim() : ""}
              defaultEmail={user?.email ?? ""}
            />
          </div>
        </Container>
      </section>

      <section className="border-t border-line bg-white">
        <Container className="py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">О проекте</h2>
              <span className="mt-3 block h-1 w-14 rounded-full bg-brand-600" aria-hidden="true" />
              <div className="mt-6 space-y-4 text-muted">
                <p>
                  MyDebate — платформа для поиска, публикации и участия в
                  дебатных турнирах и конференциях Model United Nations.
                </p>
                <p>
                  Наша цель — сделать академические мероприятия более
                  доступными, организованными и заметными для участников,
                  организаторов и образовательных учреждений.
                </p>
              </div>
            </div>
            <IllustrationPanel icon={Landmark} variant="light" />
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {MINI_CARDS.map((item) => (
              <Card key={item.title} className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <item.icon size={20} />
                </div>
                <h3 className="mt-4 font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm text-muted">{item.description}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
