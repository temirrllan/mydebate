import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Logo } from "./logo";
import {
  InstagramIcon,
  TelegramIcon,
  FacebookIcon,
} from "@/components/icons/social";

const NAV = [
  { href: "/", label: "Главная" },
  { href: "/tournaments", label: "Турниры" },
  { href: "/about", label: "О нас" },
  { href: "/contacts", label: "Контакты" },
];

const SUPPORT = [
  { href: "/help", label: "Помощь" },
  { href: "/rules", label: "Правила" },
  { href: "/privacy", label: "Политика конфиденциальности" },
  { href: "/terms", label: "Условия использования" },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Бренд */}
        <div className="lg:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
            Платформа для поиска и организации дебатных турниров и MUN
            конференций по всему Казахстану.
          </p>
          <div className="mt-5 flex items-center gap-3 text-muted">
            <a href="#" aria-label="Instagram" className="hover:text-brand-600">
              <InstagramIcon />
            </a>
            <a href="#" aria-label="Telegram" className="hover:text-brand-600">
              <TelegramIcon />
            </a>
            <a href="#" aria-label="Facebook" className="hover:text-brand-600">
              <FacebookIcon />
            </a>
          </div>
        </div>

        {/* Навигация */}
        <div>
          <h3 className="text-sm font-semibold text-ink">Навигация</h3>
          <ul className="mt-4 space-y-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-muted hover:text-brand-600"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Поддержка */}
        <div>
          <h3 className="text-sm font-semibold text-ink">Поддержка</h3>
          <ul className="mt-4 space-y-3">
            {SUPPORT.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-muted hover:text-brand-600"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Контакты */}
        <div>
          <h3 className="text-sm font-semibold text-ink">Контакты</h3>
          <ul className="mt-4 space-y-3 text-sm text-muted">
            <li className="flex items-center gap-2.5">
              <Mail size={16} className="text-brand-600" />
              MyDebate1@gmail.com
            </li>
            <li className="flex items-center gap-2.5">
              <Phone size={16} className="text-brand-600" />8 701 272 0010
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin size={16} className="text-brand-600" />
              Астана, Казахстан
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-line">
        <Container className="py-5">
          <p className="text-xs text-muted">
            © 2026 MyDebate. Все права защищены.
          </p>
        </Container>
      </div>
    </footer>
  );
}
