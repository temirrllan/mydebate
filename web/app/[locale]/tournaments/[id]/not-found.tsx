import Link from "next/link";
import { SearchX } from "lucide-react";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

/** Турнир не найден / не опубликован — не различаем причину для пользователя. */
export default async function TournamentNotFound() {
  const t = await getTranslations("errors");
  return (
    <Container className="py-20">
      <EmptyState
        icon={SearchX}
        title={t("tournamentNotFound")}
        description={t("tournamentNotFoundText")}
        action={
          <Button asChild>
            <Link href="/tournaments">{t("toTournaments")}</Link>
          </Button>
        }
      />
    </Container>
  );
}
