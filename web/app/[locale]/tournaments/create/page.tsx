import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CreateTournamentWizard } from "@/components/tournaments/create-wizard";
import { requireUser } from "@/lib/auth/session";
import { Role } from "@/lib/enums";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "createTournament" });
  return { title: t("metaTitle") };
}

export default async function CreateTournamentPage() {
  // proxy.ts уже требует авторизацию для префикса /tournaments, но страница
  // создания турнира — критическое действие, поэтому дублируем проверку
  // здесь же (как и другие auth-gated страницы в проекте, например
  // /tournaments/[id]/register) и заодно получаем callbackUrl для редиректа.
  const user = await requireUser("/tournaments/create");
  const isAdmin = user.role === Role.ADMIN;

  const t = await getTranslations("createTournament");
  const tNav = await getTranslations("nav");

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { label: tNav("home"), href: "/" },
          { label: tNav("tournaments"), href: "/tournaments" },
          { label: t("breadcrumb") },
        ]}
      />

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        {isAdmin
          ? t("introAdmin")
          : t("intro")}
      </p>

      <div className="mt-8 max-w-3xl">
        <CreateTournamentWizard isAdmin={isAdmin} />
      </div>
    </Container>
  );
}
