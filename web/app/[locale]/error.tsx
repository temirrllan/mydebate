"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

/**
 * Корневой error boundary (Next требует "use client" для error.tsx).
 * Ловит непойманные ошибки рендера в любом сегменте — не показываем стек
 * пользователю (в проде Next и так его не передаёт на клиент), только
 * дружелюбное сообщение + попытка восстановиться через reset().
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <Container className="py-20">
      <EmptyState
        icon={AlertTriangle}
        title={t("errorTitle")}
        description={t("errorText")}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => reset()}>
              <RotateCcw size={16} /> {t("retry")}
            </Button>
            <Button asChild variant="outline">
              <Link href="/">{t("toHome")}</Link>
            </Button>
          </div>
        }
      />
    </Container>
  );
}
