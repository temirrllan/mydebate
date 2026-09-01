import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Новый пароль" };

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

  return (
    <AuthLayout
      title="Войдите и откройте все возможности MyDebate"
      subtitle="Восстановите доступ к аккаунту за пару шагов."
    >
      {isValid && token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="space-y-5">
          <h1 className="text-3xl font-extrabold text-navy-900">Ссылка недействительна</h1>
          <p className="text-muted">
            Ссылка для сброса пароля недействительна или срок её действия истёк. Запросите
            новую ссылку.
          </p>
          <Button asChild size="lg" className="w-full justify-center">
            <Link href="/forgot-password">Запросить новую ссылку</Link>
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
