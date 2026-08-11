/**
 * Официальные контакты MyDebate — единая точка правды.
 * Футер, /contacts и /help читают отсюда, чтобы ссылки не расходились.
 */
export const SITE_CONTACTS = {
  email: "MyDebate1@gmail.com",
  phone: {
    display: "8 701 272 0010",
    href: "tel:+77012720010",
  },
  instagram: {
    handle: "@mydebate.kz",
    url: "https://www.instagram.com/mydebate.kz",
  },
  telegram: {
    handle: "@MyDebate_kz",
    url: "https://t.me/MyDebate_kz",
  },
  city: "Астана, Казахстан",
} as const;

/**
 * Публичный адрес сайта — единая точка правды для всего, что должно быть
 * абсолютной ссылкой: карта сайта, robots.txt, canonical, превью ссылок в
 * мессенджерах (Open Graph).
 *
 * Берём из AUTH_URL — той же переменной, на которую опираются OAuth-колбэки и
 * ссылки в письмах (lib/email/templates.ts). Держать отдельную переменную под
 * тот же адрес значит однажды поменять одну и забыть вторую.
 */
export const SITE_URL = (process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Абсолютная ссылка на страницу сайта: absoluteUrl("/tournaments") */
export function absoluteUrl(pathname: string): string {
  return `${SITE_URL}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
