import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { ParticipantsManager } from "@/components/tournaments/participants-manager";
import { requireUser } from "@/lib/auth/session";
import { listTournamentParticipants } from "@/lib/tournaments/queries";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "participants" });
  const user = await requireUser(`/tournaments/${id}/participants`);
  const result = await listTournamentParticipants(id, user.id);
  return {
    title: result
      ? t("metaTitle", { title: result.tournament.title })
      : t("metaTitleFallback"),
  };
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

  const t = await getTranslations("participants");
  const tNav = await getTranslations("nav");
  const tProfile = await getTranslations("profile");

  return (
    <Container className="py-10 sm:py-14">
      <Breadcrumbs
        items={[
          { label: tNav("home"), href: "/" },
          { label: tNav("tournaments"), href: "/tournaments" },
          { label: tProfile("tabTournaments"), href: "/profile?tab=tournaments" },
          { label: t("breadcrumb") },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            {t("count", { title: tournament.title, count: participants.length })}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/tournaments/${tournament.id}`}>
            <ArrowLeft size={16} /> {t("toTournament")}
          </Link>
        </Button>
      </div>

      <div className="mt-8">
        <ParticipantsManager
          tournamentId={tournament.id}
          tournamentTitle={tournament.title}
          participants={participants}
        />
      </div>
    </Container>
  );
}

