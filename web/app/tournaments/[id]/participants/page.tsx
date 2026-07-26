import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ParticipantsManager } from "@/components/tournaments/participants-manager";
import { requireUser } from "@/lib/auth/session";
import { listTournamentParticipants } from "@/lib/tournaments/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser(`/tournaments/${id}/participants`);
  const result = await listTournamentParticipants(id, user.id);
  return { title: result ? `Участники · ${result.tournament.title}` : "Участники турнира" };
}

export default async function TournamentParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/tournaments/${id}/participants`);

  // listTournamentParticipants возвращает данные ТОЛЬКО владельцу турнира —
  // для чужого/несуществующего турнира одинаково null, рендерим общий
  // not-found.tsx (наследуется от app/tournaments/[id]/not-found.tsx).
  const result = await listTournamentParticipants(id, user.id);
  if (!result) notFound();

  const { tournament, participants } = result;

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { label: "Главная", href: "/" },
          { label: "Турниры", href: "/tournaments" },
          { label: "Мои турниры", href: "/profile?tab=tournaments" },
          { label: "Участники" },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            Участники турнира
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            «{tournament.title}» — {participants.length}{" "}
            {pluralizeParticipant(participants.length)}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/tournaments/${tournament.id}`}>
            <ArrowLeft size={16} /> К турниру
          </Link>
        </Button>
      </div>

      <div className="mt-8">
        <ParticipantsManager tournamentId={tournament.id} participants={participants} />
      </div>
    </Container>
  );
}

function pluralizeParticipant(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "участник";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "участника";
  return "участников";
}
