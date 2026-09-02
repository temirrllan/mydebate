import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contacts" });
  return { title: t("metaTitle") };
}

// Иконки и порядок — здесь, тексты — в словаре (namespace "contacts").
const MINI_CARDS = [
  { icon: Target, key: "forParticipants" },
  { icon: Landmark, key: "forOrganizers" },
  { icon: Users, key: "forCommunity" },
] as const;

export default async function ContactsPage() {
  // Страница остаётся публичной (гость тоже может написать в поддержку,
  // см. lib/actions/support.ts) — getCurrentUser() здесь используется только
  // для преднаполнения формы, а не для гейта доступа.
  const user = await getCurrentUser();

  const t = await getTranslations("contacts");
  const tNav = await getTranslations("nav");

  return (
    <>
      <section className="bg-white">
        <Container className="py-10 lg:py-14">
          <Breadcrumbs
            items={[{ label: tNav("home"), href: "/" }, { label: tNav("contacts") }]}
            className="mb-8"
          />

          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge tone="blue" className="mb-5">
                {t("badge")}
              </Badge>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-5xl">
                {t("title")}
              </h1>
              <p className="mt-5 max-w-lg text-lg text-muted">{t("intro")}</p>
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
              label={t("phone")}
              value={SITE_CONTACTS.phone.display}
              action={
                <Button asChild variant="outline" size="sm" className="w-full">
                  <a href={SITE_CONTACTS.phone.href}>
                    <Phone size={16} /> {t("call")}
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
                    <Mail size={16} /> {t("writeEmail")}
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
                    {t("openInstagram")}
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
                    {t("openTelegram")}
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
              <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">{t("aboutTitle")}</h2>
              <span className="mt-3 block h-1 w-14 rounded-full bg-brand-600" aria-hidden="true" />
              <div className="mt-6 space-y-4 text-muted">
                <p>{t("aboutP1")}</p>
                <p>{t("aboutP2")}</p>
              </div>
            </div>
            <IllustrationPanel icon={Landmark} variant="light" />
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {MINI_CARDS.map((item) => (
              <Card key={item.key} className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <item.icon size={20} />
                </div>
                <h3 className="mt-4 font-semibold text-ink">{t(item.key)}</h3>
                <p className="mt-1 text-sm text-muted">{t(`${item.key}Text`)}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
