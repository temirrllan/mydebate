import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { Container } from "@/components/ui/container";
import { AdminNav } from "@/components/admin/admin-nav";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("metaTitle") };
}

/**
 * Общий каркас всех /admin* страниц — вторая линия защиты поверх
 * proxy.ts (оптимистичная JWT-проверка): здесь requireAdmin() перепроверяет
 * роль/isBlocked в БД (см. lib/auth/session.ts) на каждый рендер.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("admin");
  await requireAdmin();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-canvas">
      <Container className="py-8 sm:py-10">
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("intro")}
        </p>

        <div className="mt-6">
          <AdminNav />
        </div>

        <div className="mt-8">{children}</div>
      </Container>
    </div>
  );
}
