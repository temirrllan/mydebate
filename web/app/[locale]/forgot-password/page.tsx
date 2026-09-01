import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { getCurrentUser } from "@/lib/auth/session";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Восстановление пароля" };

export default async function ForgotPasswordPage() {
  // Тот же гвард, что на /login и /register: авторизованному восстанавливать
  // доступ незачем — пароль он меняет в настройках профиля.
  const user = await getCurrentUser();
  if (user) {
    redirect("/profile");
  }

  return (
    <AuthLayout
      title="Войдите и откройте все возможности MyDebate"
      subtitle="Восстановите доступ к аккаунту за пару шагов."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
