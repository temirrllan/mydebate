import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EditTournamentForm } from "@/components/tournaments/edit-form";
import { requireUser } from "@/lib/auth/session";
import { getTournamentForEdit } from "@/lib/tournaments/queries";
import { Role } from "@/lib/enums";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "createTournament" });
  const user = await requireUser(`/tournaments/${id}/edit`);
  const tournament = await getTournamentForEdit(id, user.id, user.role === Role.ADMIN);
  return {
    title: tournament
      ? t("editMetaTitle", { title: tournament.title })
      : t("editMetaFallback"),
  };
}

export default async function EditTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/tournaments/${id}/edit`);

  // getTournamentForEdit возвращает данные владельцу турнира ИЛИ админу (админ
  // может править любой турнир) — для чужого/несуществующего одинаково null (не
  // палим разницу), рендерим общий not-found.tsx.
  const isAdmin = user.role === Role.ADMIN;
  const tournament = await getTournamentForEdit(id, user.id, isAdmin);
  if (!tournament) notFound();

  const t = await getTranslations("createTournament");
  const tNav = await getTranslations("nav");

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { label: tNav("home"), href: "/" },
          { label: tNav("tournaments"), href: "/tournaments" },
          { label: t("myTournaments"), href: "/profile?tab=tournaments" },
          { label: t("editBreadcrumb") },
        ]}
      />

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
        {t("editTitle")}
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        {t("editIntro", { title: tournament.title })}
      </p>

      <div className="mt-8 max-w-3xl">
        <EditTournamentForm tournament={tournament} />
      </div>
    </Container>
  );
}
