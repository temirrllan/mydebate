import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { getCurrentUser } from "@/lib/auth/session";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Регистрация" };

// Next.js 16: searchParams — Promise, обязательно await (Async Request APIs).
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl?.startsWith("/") ? params.callbackUrl : "/profile";

  // Гвард: уже авторизованный посетитель, зашедший на /register повторно, не
  // должен видеть/отправлять форму регистрации — иначе повторный signIn()
  // внутри registerUser() срабатывает поверх активной сессии и может стереть
  // валидную cookie (тот же класс бага, что и на /login, см. QA).
  const user = await getCurrentUser();
  if (user) {
    redirect(callbackUrl);
  }

  return (
    <AuthLayout
      title="Почему участники выбирают MyDebate?"
      subtitle="Присоединяйтесь к сообществу дебатёров и организаторов по всему Казахстану."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
