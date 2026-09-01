import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import "../globals.css";
import { NoPinchZoom } from "@/components/layout/no-pinch-zoom";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { getCurrentUser } from "@/lib/auth/session";
import { getUnreadNotificationCount } from "@/lib/profile/queries";
import { SITE_URL } from "@/lib/site";
import { routing } from "@/i18n/routing";
import { localeAlternates } from "@/lib/i18n/alternates";

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

/**
 * Метаданные зависят от языка, поэтому это generateMetadata, а не статический
 * `export const metadata`: заголовок и описание сайта в выдаче должны быть на
 * том языке, на который пришёл пользователь.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Тот же отсев мусора, что и в самом layout: сегмент [locale] ловит любые
  // пути, а localeAlternates ждёт настоящую локаль.
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: "meta" });

  const title = t("siteTitle");
  const description = t("siteDescription");

  return {
    // Без metadataBase все относительные ссылки в превью (og:image и прочее)
    // остаются относительными, а мессенджеры и поисковики понимают только
    // абсолютные — превью просто не покажется.
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: "%s · MyDebate" },
    description,
    keywords: t("keywords").split(",").map((k) => k.trim()),
    // hreflang: говорит поисковику, что три адреса — один документ на разных
    // языках, а не три страницы-дубля.
    alternates: localeAlternates("/", locale),
    // Превью при отправке ссылки в WhatsApp, Telegram и соцсети. Без него
    // вместо карточки будет голый адрес.
    openGraph: {
      type: "website",
      siteName: "MyDebate",
      locale: t("ogLocale"),
      url: SITE_URL,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  // Сегмент [locale] ловит и то, что локалью не является (/unknown.txt),
  // поэтому неизвестное значение — это 404, а не «покажем по-русски».
  if (!hasLocale(routing.locales, locale)) notFound();

  // Централизованный хелпер сессии (lib/auth/session.ts) — перепроверяет
  // isBlocked/роль в БД, а не просто доверяет JWT. Прокидывается в Navbar,
  // чтобы шапка была session-aware на каждой странице (см. задачу Этапа 3).
  const user = await getCurrentUser();

  // Счётчик непрочитанных уведомлений для колокольчика в шапке — чтобы
  // пользователь видел новое, не заходя в кабинет. Считаем только для
  // авторизованного (у гостя уведомлений нет).
  const unreadNotifications = user ? await getUnreadNotificationCount(user.id) : 0;

  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html lang={locale} className={`${inter.variable} h-full`} data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col bg-canvas text-ink antialiased">
        {/* Провайдер отдаёт словарь клиентским компонентам (формы, фильтры,
            переключатель языка). Без него useTranslations в "use client"
            падает с «No intl context found». */}
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white"
          >
            {t("skipToContent")}
          </a>
          <NoPinchZoom />
          <Navbar user={user} unreadNotifications={unreadNotifications} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
