import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { Container } from "@/components/ui/container";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = { title: "Админ-панель" };

/**
 * Общий каркас всех /admin* страниц — вторая линия защиты поверх
 * proxy.ts (оптимистичная JWT-проверка): здесь requireAdmin() перепроверяет
 * роль/isBlocked в БД (см. lib/auth/session.ts) на каждый рендер.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas">
      <Container className="py-8 sm:py-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Админ-панель</h1>
        <p className="mt-1 text-sm text-muted">
          Модерация турниров, управление пользователями, организаторами и обращениями в поддержку.
        </p>

        <div className="mt-6">
          <AdminNav />
        </div>

        <div className="mt-8">{children}</div>
      </Container>
    </div>
  );
}
