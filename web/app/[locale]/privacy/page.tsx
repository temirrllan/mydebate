import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata: Metadata = { title: "Политика конфиденциальности" };

export default function PrivacyPage() {
  return (
    <section className="bg-white">
      <Container className="py-10 lg:py-14">
        <Breadcrumbs
          items={[{ label: "Главная", href: "/" }, { label: "Политика конфиденциальности" }]}
          className="mb-8"
        />

        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-navy-900 sm:text-4xl">
          Политика конфиденциальности
        </h1>
        <div className="mt-6 max-w-2xl space-y-4 text-muted">
          <p>
            MyDebate обрабатывает персональные данные пользователей (имя,
            email, телефон и другие сведения профиля) исключительно для
            обеспечения работы платформы: регистрации на турниры, связи с
            организаторами и уведомлений о статусе заявок.
          </p>
          <p>
            Мы не передаём персональные данные третьим лицам без согласия
            пользователя, за исключением случаев, предусмотренных
            законодательством Республики Казахстан. Полная редакция политики
            конфиденциальности будет опубликована по мере развития платформы.
          </p>
        </div>
      </Container>
    </section>
  );
}
