import Link from "next/link";
import { Compass } from "lucide-react";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

/**
 * Брендированная 404 для любого неизвестного маршрута (Next.js рендерит
 * этот файл автоматически вместо стандартной английской страницы). Не
 * путать с app/tournaments/[id]/not-found.tsx — тот специфичен для
 * турниров, этот покрывает весь остальной сайт.
 */
export default function NotFound() {
  return (
    <Container className="py-20">
      <EmptyState
        icon={Compass}
        title="Страница не найдена"
        description="Возможно, ссылка устарела или страница была перемещена. Проверьте адрес или вернитесь на главную."
        action={
          <Button asChild>
            <Link href="/">На главную</Link>
          </Button>
        }
      />
    </Container>
  );
}
