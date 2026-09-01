import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { ResetPasswordForm } from "./reset-password-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.reset" });
  return { title: t("metaTitle") };
}

// Next.js 16: searchParams — Promise, обязательно await.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  // Тот же гвард, что на /login и /forgot-password: под активной сессией сброс
  // по ссылке из письма не нужен и сбивает cookie (см. комментарий в /login).
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect("/profile");
  }

  const { token } = await searchParams;

  const resetToken = token
    ? await prisma.passwordResetToken.findUnique({ where: { token } })
    : null;
  const isValid = Boolean(resetToken && resetToken.expiresAt > new Date());

  const t = await getTranslations("auth");

  return (
    <AuthLayout title={t("sidebarTitle")} subtitle={t("sidebarRecoverSubtitle")}>
      {isValid && token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-5">
          <h1 className="text-3xl font-extrabold text-navy-900">{t("reset.invalidTitle")}</h1>
          <p className="text-muted">{t("reset.invalidText")}</p>
          <Button asChild size="lg" className="w-full justify-center">
            <Link href="/forgot-password">{t("reset.requestNew")}</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
