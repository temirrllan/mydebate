import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = { title: "Условия использования" };

export default function TermsPage() {
  return (
    <section className="bg-white">
      <Container className="py-10 lg:py-14">
        <Breadcrumbs
          items={[{ label: "Главная", href: "/" }, { label: "Условия использования" }]}
          className="mb-8"
        />

        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-4xl">
          Условия использования
        </h1>
        <div className="mt-6 max-w-2xl space-y-4 text-muted">
          <p>
            Используя платформу MyDebate, вы соглашаетесь с правилами
            размещения и участия в турнирах, описанными на странице{" "}
            <a href="/rules" className="font-medium text-brand-600 hover:text-brand-700">
              «Правила и условия»
            </a>
            . MyDebate предоставляет информационные услуги по поиску,
            публикации и регистрации на дебатные турниры и MUN-конференции.
          </p>
          <p>
            Администрация оставляет за собой право ограничивать доступ к
            аккаунту при нарушении правил сообщества, а также изменять состав
            и функциональность сервиса по мере развития платформы.
          </p>
        </div>
      </Container>
    </section>
  );
}
