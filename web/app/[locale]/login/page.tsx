import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход" };

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

  let infoMessage: string | undefined;
  if (params.reset === "success") {
    infoMessage = "Пароль успешно изменён. Войдите с новым паролем.";
  } else if (params.registered === "1") {
    infoMessage = "Аккаунт создан. Войдите, используя ваш email и пароль.";
  }

  return (
    <AuthLayout
      title="Войдите и откройте все возможности MyDebate"
      subtitle="Находите турниры, сохраняйте события и управляйте участием в одном личном кабинете."
    >
      <LoginForm callbackUrl={callbackUrl} infoMessage={infoMessage} />
    </AuthLayout>
  );
}
