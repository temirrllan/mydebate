import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CreateTournamentWizard } from "@/components/tournaments/create-wizard";
import { requireUser } from "@/lib/auth/session";
import { Role } from "@/lib/enums";

export const metadata: Metadata = { title: "Создать турнир" };

export default async function CreateTournamentPage() {
  // proxy.ts уже требует авторизацию для префикса /tournaments, но страница
  // создания турнира — критическое действие, поэтому дублируем проверку
  // здесь же (как и другие auth-gated страницы в проекте, например
  // /tournaments/[id]/register) и заодно получаем callbackUrl для редиректа.
  const user = await requireUser("/tournaments/create");
  const isAdmin = user.role === Role.ADMIN;

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: "Турниры", href: "/tournaments" },
          { label: "Создать турнир" },
        ]}
      />

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
        Создание турнира
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        {isAdmin
          ? "Заполните информацию о турнире в 3 шага. Как администратор вы публикуете турнир сразу, без модерации."
          : "Заполните информацию о турнире в 3 шага. После отправки заявка пройдёт модерацию — мы уведомим вас о результате."}
      </p>

      <div className="mt-8 max-w-3xl">
        <CreateTournamentWizard isAdmin={isAdmin} />
      </div>
    </Container>
  );
}
