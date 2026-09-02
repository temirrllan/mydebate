"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, Users, UserCog, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const SECTIONS: { href: string; key: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { href: "/admin", key: "navOverview", icon: LayoutDashboard, exact: true },
  { href: "/admin/moderation", key: "navModeration", icon: ShieldCheck },
  { href: "/admin/users", key: "navUsers", icon: Users },
  { href: "/admin/organizers", key: "navOrganizers", icon: UserCog },
  { href: "/admin/support", key: "navSupport", icon: LifeBuoy },
];

/** Навигация по разделам админ-панели (app/admin/layout.tsx) — активный пункт подсвечен по pathname. */
export function AdminNav() {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <div className="relative">
      <nav
        aria-label={t("navLabel")}
        className="flex gap-1 overflow-x-auto border-b border-line sm:gap-2"
      >
        {SECTIONS.map((section) => {
          const active = section.exact ? pathname === section.href : pathname.startsWith(section.href);
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-3 text-sm font-medium transition-colors",
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-600 hover:text-ink",
              )}
            >
              <Icon size={16} />
              {t(section.key)}
            </Link>
          );
        })}
      </nav>
      {/* Подсказка прокрутки на узких экранах — таб-бар шире вьюпорта
          (напр. "Обращения" обрезается на 390px), градиент справа намекает,
          что список можно проскроллить. Скрыт на md+, где табы обычно
          помещаются целиком. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-canvas to-transparent md:hidden"
      />
    </div>
  );
}
