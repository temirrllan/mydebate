import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Доступ запрещён" };

// Целевая страница для ролевого отказа (403): гость не сюда попадает — для
// гостя всегда редирект на /login (see proxy.ts). Сюда попадает
// авторизованный пользователь без нужной роли (например, не ADMIN на /admin).
export default function ForbiddenPage() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <ShieldAlert size={32} />
      </span>
      <h1 className="mt-6 text-2xl font-extrabold text-navy-900">Доступ запрещён</h1>
      <p className="mt-2 max-w-md text-muted">
        У вас недостаточно прав для просмотра этой страницы. Если это ошибка — обратитесь в
        поддержку.
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">На главную</Link>
      </Button>
    </Container>
  );
}
