import type { Metadata } from "next";
import { MessageCircleQuestion, Phone, Mail } from "lucide-react";
import { Container } from "@/components/ui/container";
import { IllustrationPanel } from "@/components/ui/illustration-panel";
import { Button } from "@/components/ui/button";
import { ContactCard } from "@/components/contact-card";
import { InstagramIcon, TelegramIcon } from "@/components/icons/social";
import { SITE_CONTACTS } from "@/lib/site";
import { FaqProvider } from "@/components/help/faq-provider";
import { FaqSearchInput } from "@/components/help/faq-search-input";
import { FaqAccordion } from "@/components/help/faq-accordion";

export const metadata: Metadata = { title: "Помощь" };

export default function HelpPage() {
  return (
    <FaqProvider>
      {/* Hero + поиск */}
      <section className="bg-white">
        <Container className="grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-4xl">
              Центр поддержки MyDebate
            </h1>
            <p className="mt-4 max-w-lg text-muted">
              Найдите ответы на часто задаваемые вопросы или свяжитесь с нашей
              командой, если вам потребуется дополнительная помощь.
            </p>
            <div className="mt-6">
              <FaqSearchInput />
            </div>
          </div>

          <IllustrationPanel icon={MessageCircleQuestion} variant="light" />
        </Container>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-canvas">
        <Container className="py-16 lg:py-20">
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">
            Часто задаваемые вопросы
          </h2>
          <div className="mt-8">
            <FaqAccordion />
          </div>
        </Container>
      </section>

      {/* Контакты */}
      <section className="bg-white">
        <Container className="py-16 lg:py-20">
          <h2 className="text-2xl font-bold text-navy-900 sm:text-3xl">
            Не нашли ответ на свой вопрос?
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            Если вы не смогли найти нужную информацию в разделе FAQ, свяжитесь
            с нашей командой. Мы постараемся помочь вам в кратчайшие сроки.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
    </FaqProvider>
  );
}
