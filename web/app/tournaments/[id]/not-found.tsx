import Link from "next/link";
import { SearchX } from "lucide-react";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

/** Турнир не найден / не опубликован — не различаем причину для пользователя. */
export default function TournamentNotFound() {
  return (
    <Container className="py-20">
      <EmptyState
        icon={SearchX}
        title="Турнир не найден"
        description="Возможно, он был удалён, скрыт или ещё не опубликован организатором."
        action={
          <Button asChild>
            <Link href="/tournaments">Ко всем турнирам</Link>
          </Button>
        }
      />
    </Container>
  );
}
