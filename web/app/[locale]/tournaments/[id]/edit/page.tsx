import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EditTournamentForm } from "@/components/tournaments/edit-form";
import { requireUser } from "@/lib/auth/session";
import { getTournamentForEdit } from "@/lib/tournaments/queries";
import { Role } from "@/lib/enums";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser(`/tournaments/${id}/edit`);
  const tournament = await getTournamentForEdit(id, user.id, user.role === Role.ADMIN);
  return { title: tournament ? `Редактирование · ${tournament.title}` : "Редактирование турнира" };
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

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: "Турниры", href: "/tournaments" },
          { label: "Мои турниры", href: "/profile?tab=tournaments" },
          { label: "Редактирование" },
        ]}
      />

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
        Редактирование турнира
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        «{tournament.title}» — изменения вступят в силу сразу, без повторной модерации.
      </p>

      <div className="mt-8 max-w-3xl">
        <EditTournamentForm tournament={tournament} />
      </div>
    </Container>
  );
}
