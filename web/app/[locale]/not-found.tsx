import Link from "next/link";
import { Compass } from "lucide-react";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

/**
 * Брендированная 404 для любого неизвестного маршрута (Next.js рендерит
 * этот файл автоматически вместо стандартной английской страницы). Не
 * путать с app/tournaments/[id]/not-found.tsx — тот специфичен для
 * турниров, этот покрывает весь остальной сайт.
 */
export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <Container className="py-20">
      <EmptyState
        icon={Compass}
        title={t("notFoundTitle")}
        description={t("notFoundText")}
        action={
          <Button asChild>
            <Link href="/">{t("toHome")}</Link>
          </Button>
        }
      />
    </Container>
  );
}
