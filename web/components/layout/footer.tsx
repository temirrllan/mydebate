import { getTranslations } from "next-intl/server";
import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { Logo } from "./logo";
import { InstagramIcon, TelegramIcon } from "@/components/icons/social";
import { SITE_CONTACTS } from "@/lib/site";

// Подписи приходят из словаря по ключу — как и в шапке (components/layout/
// navbar.tsx), список остаётся структурой, а не текстом.
const NAV = [
  { href: "/", key: "home" },
  { href: "/tournaments", key: "tournaments" },
  { href: "/about", key: "about" },
  { href: "/contacts", key: "contacts" },
] as const;

const SUPPORT = [
  { href: "/help", key: "help" },
  { href: "/rules", key: "rules" },
  { href: "/privacy", key: "privacy" },
  { href: "/terms", key: "terms" },
] as const;

export async function Footer() {
  // Подвал — серверный компонент, поэтому getTranslations, а не хук
  // useTranslations: он ничего не делает на клиенте и незачем тащить его
  // словарь в бандл.
  const t = await getTranslations("footer");
  const tNav = await getTranslations("nav");
  return (
    <footer className="border-t border-line bg-white">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Бренд */}
        <div className="lg:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            {t("tagline")}
          </p>
          <div className="mt-5 flex items-center gap-3 text-muted">
            <a
              href={SITE_CONTACTS.instagram.url}
              target="_blank"
              rel="noreferrer"
              aria-label={t("instagramLabel", { handle: SITE_CONTACTS.instagram.handle })}
              className="hover:text-brand-600"
            >
              <InstagramIcon />
            </a>
            <a
              href={SITE_CONTACTS.telegram.url}
              target="_blank"
              rel="noreferrer"
              aria-label={t("telegramLabel", { handle: SITE_CONTACTS.telegram.handle })}
              className="hover:text-brand-600"
            >
              <TelegramIcon />
            </a>
            <a
              href={`mailto:${SITE_CONTACTS.email}`}
              aria-label={t("emailLabel", { email: SITE_CONTACTS.email })}
              className="hover:text-brand-600"
            >
              <Mail size={20} />
            </a>
          </div>
        </div>

        {/* Навигация */}
        <div>
          <h3 className="text-sm font-semibold text-ink">{t("navTitle")}</h3>
          <ul className="mt-4 space-y-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-muted hover:text-brand-600"
                >
                  {tNav(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Поддержка */}
        <div>
          <h3 className="text-sm font-semibold text-ink">{t("supportTitle")}</h3>
          <ul className="mt-4 space-y-3">
            {SUPPORT.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-muted hover:text-brand-600"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Контакты */}
        <div>
          <h3 className="text-sm font-semibold text-ink">{t("contactsTitle")}</h3>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li className="flex items-center gap-2.5">
              <Mail size={16} className="text-brand-600" />
              <a
                href={`mailto:${SITE_CONTACTS.email}`}
                className="hover:text-brand-600"
              >
                {SITE_CONTACTS.email}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone size={16} className="text-brand-600" />
              <a
                href={SITE_CONTACTS.phone.href}
                className="hover:text-brand-600"
              >
                {SITE_CONTACTS.phone.display}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin size={16} className="text-brand-600" />
              {SITE_CONTACTS.city}
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-line">
        <Container className="py-5">
          <p className="text-xs text-muted">
            {/* Год берём из системного времени: зашитый «2026» в подвале
                устаревает молча — его никто не замечает годами. */}
            {/* Год — строкой, а не числом: числовой плейсхолдер ICU
                форматируется по локали, и 2026 превратилось бы в «2 026». */}
            {t("copyright", { year: String(new Date().getFullYear()) })}
          </p>
        </Container>
      </div>
    </footer>
  );
}
