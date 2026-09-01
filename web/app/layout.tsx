import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NoPinchZoom } from "@/components/layout/no-pinch-zoom";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/profile/queries";
import { SITE_URL } from "@/lib/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// Запрет масштабирования щипком — по требованию заказчика: вёрстка
// адаптивная, и случайный зум двумя пальцами на телефоне только сбивает
// раскладку.
//
// ОГОВОРКА: этих полей достаточно для Chrome на Android, но Safari на iOS
// с 10-й версии намеренно игнорирует и `user-scalable=no`, и
// `maximum-scale` — именно чтобы страница не могла запретить зум. Там щипок
// перехватывается уже в JS (components/layout/no-pinch-zoom.tsx).
//
// Учтите, что для человека со слабым зрением зум — способ прочитать мелкий
// текст. Мы его отключаем, поэтому размеры шрифтов ниже 14px в интерфейсе
// заводить не стоит: увеличить их пользователь больше не сможет.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  // Без metadataBase все относительные ссылки в превью (og:image и прочее)
  // остаются относительными, а мессенджеры и поисковики понимают только
  // абсолютные — превью просто не покажется.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MyDebate — дебатные турниры и MUN-конференции Казахстана",
    template: "%s · MyDebate",
  },
  description:
    "Все актуальные дебатные турниры и MUN-конференции на одной платформе. Находи, публикуй и регистрируйся на мероприятия.",
  keywords: [
    "дебатные турниры",
    "дебаты Казахстан",
    "MUN конференции",
    "Модель ООН",
    "турниры по дебатам Алматы",
    "турниры по дебатам Астана",
    "школьные дебаты",
  ],
  alternates: { canonical: "/" },
  // Превью при отправке ссылки в WhatsApp, Telegram и соцсети. Без него
  // вместо карточки будет голый адрес.
  openGraph: {
    type: "website",
    siteName: "MyDebate",
    locale: "ru_RU",
    url: SITE_URL,
    title: "MyDebate — дебатные турниры и MUN-конференции Казахстана",
    description:
      "Все актуальные дебатные турниры и MUN-конференции на одной платформе. Находи, публикуй и регистрируйся на мероприятия.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyDebate — дебатные турниры и MUN-конференции Казахстана",
    description: "Все актуальные дебатные турниры и MUN-конференции на одной платформе.",
  },
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
        <NoPinchZoom />
        <Navbar user={user} unreadNotifications={unreadNotifications} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
