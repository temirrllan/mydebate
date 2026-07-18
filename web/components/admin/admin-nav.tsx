"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, Users, UserCog, LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS: { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { href: "/admin", label: "Обзор", icon: LayoutDashboard, exact: true },
  { href: "/admin/moderation", label: "Модерация", icon: ShieldCheck },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/organizers", label: "Организаторы", icon: UserCog },
  { href: "/admin/support", label: "Обращения", icon: LifeBuoy },
];

/** Навигация по разделам админ-панели (app/admin/layout.tsx) — активный пункт подсвечен по pathname. */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="relative">
      <nav
        aria-label="Разделы админ-панели"
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
              {section.label}
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
