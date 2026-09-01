import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/auth/auth-layout";
import { getCurrentUser } from "@/lib/auth/session";
import { ForgotPasswordForm } from "./forgot-password-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.forgot" });
  return { title: t("metaTitle") };
}

export default async function ForgotPasswordPage() {
  // Тот же гвард, что на /login и /register: авторизованному восстанавливать
  // доступ незачем — пароль он меняет в настройках профиля.
  const user = await getCurrentUser();
  if (user) {
    redirect("/profile");
  }

  const t = await getTranslations("auth");

  return (
    <AuthLayout title={t("sidebarTitle")} subtitle={t("sidebarRecoverSubtitle")}>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
