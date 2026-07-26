import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/profile/queries";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MyDebate — дебатные турниры и MUN-конференции Казахстана",
    template: "%s · MyDebate",
  },
  description:
    "Все актуальные дебатные турниры и MUN-конференции на одной платформе. Находи, публикуй и регистрируйся на мероприятия.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Централизованный хелпер сессии (lib/auth/session.ts) — перепроверяет
  // isBlocked/роль в БД, а не просто доверяет JWT. Прокидывается в Navbar,
  // чтобы шапка была session-aware на каждой странице (см. задачу Этапа 3).
  const user = await getCurrentUser();

  // Счётчик непрочитанных уведомлений для колокольчика в шапке — чтобы
  // пользователь видел новое, не заходя в кабинет. Считаем только для
  // авторизованного (у гостя уведомлений нет).
  const unreadNotifications = user ? await getUnreadNotificationCount(user.id) : 0;

  return (
    <html lang="ru" className={`${inter.variable} h-full`} data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col bg-canvas text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white"
        >
          Перейти к содержимому
        </a>
        <Navbar user={user} unreadNotifications={unreadNotifications} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
