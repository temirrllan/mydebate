import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthLayout } from "@/components/auth/auth-layout";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.login" });
  return { title: t("metaTitle") };
}

// Next.js 16: searchParams — Promise, обязательно await (Async Request APIs).
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; registered?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl?.startsWith("/") ? params.callbackUrl : "/profile";

  // Гвард: уже авторизованный посетитель, зашедший на /login повторно
  // (например, по старой вкладке/ссылке), не должен видеть/отправлять форму
  // входа — иначе повторный signIn() в loginUser() срабатывает поверх
  // активной сессии и может стереть валидную cookie (баг из QA). Уводим его
  // сразу туда, куда вела бы форма при обычном входе.
  const user = await getCurrentUser();
  if (user) {
    redirect(callbackUrl);
  }

  const t = await getTranslations("auth");

  let infoMessage: string | undefined;
  if (params.reset === "success") {
    infoMessage = t("login.afterReset");
  } else if (params.registered === "1") {
    infoMessage = t("login.afterRegister");
  }

  return (
    <AuthLayout title={t("sidebarTitle")} subtitle={t("sidebarSubtitle")}>
      <LoginForm callbackUrl={callbackUrl} infoMessage={infoMessage} />
    </AuthLayout>
  );
}
