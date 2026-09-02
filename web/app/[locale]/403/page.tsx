import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "errors" });
  return { title: t("forbiddenMeta") };
}

// Целевая страница для ролевого отказа (403): гость не сюда попадает — для
// гостя всегда редирект на /login (see proxy.ts). Сюда попадает
// авторизованный пользователь без нужной роли (например, не ADMIN на /admin).
export default async function ForbiddenPage() {
  const t = await getTranslations("errors");
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <ShieldAlert size={32} />
      </span>
      <h1 className="mt-6 text-2xl font-extrabold text-navy-900">{t("forbiddenTitle")}</h1>
      <p className="mt-2 max-w-md text-muted">
        {t("forbiddenText")}
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">{t("toHome")}</Link>
      </Button>
    </Container>
  );
}
