import type { NextConfig } from "next";

// Заголовки безопасности на все ответы. Консервативный набор, который НЕ
// ломает работу приложения:
//  - HSTS — заставляет браузер ходить только по HTTPS (действует после
//    первого визита по https; на localhost игнорируется браузером).
//  - X-Frame-Options: DENY — защита от кликджекинга (сайт нельзя встроить в iframe).
//  - X-Content-Type-Options: nosniff — браузер не «додумывает» MIME-типы.
//  - Referrer-Policy — не утекает полный URL на сторонние сайты.
//  - Permissions-Policy — отключаем неиспользуемые мощные API.
// Полноценный Content-Security-Policy намеренно не добавлен: у Next есть
// инлайновые скрипты гидрации, и строгий CSP без nonce-обвязки сломал бы
// страницу — это отдельная задача, не для правки «в одну строку».
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  images: {
    // Аватары Google-пользователей (OAuth) отдаются с googleusercontent.com —
    // next/image требует явно разрешить внешний хост.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      // Обложки/логотипы турниров в проде лежат в Vercel Blob (см.
      // app/api/uploads/tournament-image/route.ts). Публичный хост хранилища —
      // <id>.public.blob.vercel-storage.com, id выдаётся при создании стора,
      // поэтому поддомен задан шаблоном.
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
