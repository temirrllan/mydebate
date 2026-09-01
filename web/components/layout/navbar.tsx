"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Menu, X, LogOut, ShieldCheck, Bell } from "lucide-react";
// Link и usePathname — из i18n/navigation, а не из next/*: обычный <Link>
// потерял бы префикс локали и увёл бы казахоязычного пользователя на русскую
// версию страницы.
import { Link, usePathname } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { logoutUser } from "@/lib/actions/auth";
import { Role } from "@/lib/enums";
import type { CurrentUser } from "@/lib/auth/session";

// Подписи берутся из словаря по ключу — сам список остаётся структурой,
// а не текстом (иначе он был бы третьим местом, где живут переводы).
const NAV = [
  { href: "/", key: "home" },
  { href: "/tournaments", key: "tournaments" },
  { href: "/about", key: "about" },
  { href: "/contacts", key: "contacts" },
] as const;

// Пользователь передаётся из app/layout.tsx (Server Component, await
// getCurrentUser()) — навбар сам не обращается к сессии, только рендерит
// то, что получил (spec: "session-aware navbar", баг Этапа 2 исправлен здесь).
type NavbarProps = {
  user: CurrentUser | null;
  /** Непрочитанные уведомления — счётчик на колокольчике (0 = бейдж скрыт). */
  unreadNotifications?: number;
};

/** Колокольчик уведомлений со счётчиком непрочитанных (ведёт в кабинет). */
function NotificationBell({ count, onClick }: { count: number; onClick?: () => void }) {
  const t = useTranslations("nav");
  const label = count > 0 ? t("notificationsWithCount", { count }) : t("notifications");
  return (
    <Link
      href="/profile?tab=notifications"
      onClick={onClick}
      aria-label={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-brand-50 hover:text-brand-700"
    >
      <Bell size={19} />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 flex min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-[16px] text-white"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

function Avatar({ user }: { user: CurrentUser }) {
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  if (user.image) {
    return (
      <Image
        src={user.image}
        alt=""
        width={26}
        height={26}
        className="h-[26px] w-[26px] rounded-full object-cover"
      />
    );
  }
  return (
    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700">
      {initials || "U"}
    </span>
  );
}

const MOBILE_MENU_ID = "mobile-nav-menu";

export function Navbar({ user, unreadNotifications = 0 }: NavbarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const isAdmin = user?.role === Role.ADMIN;

  function closeMenu() {
    setOpen(false);
    burgerRef.current?.focus();
  }

  // Закрытие мобильного меню по Escape с возвратом фокуса на кнопку-бургер.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Logo />

        {/* Десктоп-меню */}
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "text-brand-600"
                  : "text-slate-600 hover:text-ink",
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        {/* Действия (десктоп) */}
        <div className="hidden items-center gap-2 lg:flex">
          <LocaleSwitcher className="mr-1" />
          <Button asChild variant="outline" size="sm">
            <Link href="/tournaments/create">{t("createTournament")}</Link>
          </Button>

          {user ? (
            <>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin">
                    <ShieldCheck size={16} />
                    {t("admin")}
                  </Link>
                </Button>
              )}
              <NotificationBell count={unreadNotifications} />
              <Button asChild variant="ghost" size="sm">
                <Link href="/profile">
                  <Avatar user={user} />
                  {user.firstName}
                </Link>
              </Button>
              <form action={logoutUser}>
                <Button type="submit" variant="outline" size="sm">
                  <LogOut size={16} />
                  {t("logout")}
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">{t("login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">{t("register")}</Link>
              </Button>
            </>
          )}
        </div>

        {/* Бургер */}
        <button
          ref={burgerRef}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={t("menu")}
          aria-expanded={open}
          aria-controls={MOBILE_MENU_ID}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </Container>

      {/* Мобильное меню */}
      {open && (
        <div id={MOBILE_MENU_ID} className="border-t border-line bg-white lg:hidden">
          <nav aria-label={t("mobileMenu")}>
          <Container className="flex flex-col gap-1 py-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium",
                  isActive(item.href)
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-canvas",
                )}
              >
                {t(item.key)}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <LocaleSwitcher className="mb-1 justify-center" />
              <Button asChild variant="outline">
                <Link href="/tournaments/create" onClick={closeMenu}>
                  {t("createTournament")}
                </Link>
              </Button>

              {user ? (
                <>
                  {isAdmin && (
                    <Button asChild variant="ghost">
                      <Link href="/admin" onClick={closeMenu}>
                        <ShieldCheck size={16} />
                        {t("admin")}
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="ghost">
                    <Link href="/profile?tab=notifications" onClick={closeMenu}>
                      <Bell size={16} />
                      {t("notifications")}
                      {unreadNotifications > 0 && (
                        <span className="ml-auto flex min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-xs font-semibold text-white">
                          {unreadNotifications > 9 ? "9+" : unreadNotifications}
                        </span>
                      )}
                    </Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/profile" onClick={closeMenu}>
                      <Avatar user={user} />
                      {user.firstName} {user.lastName}
                    </Link>
                  </Button>
                  <form action={logoutUser}>
                    <Button type="submit" variant="outline" className="w-full">
                      <LogOut size={16} />
                      {t("logout")}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost">
                    <Link href="/login" onClick={closeMenu}>
                      {t("login")}
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register" onClick={closeMenu}>
                      {t("register")}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </Container>
          </nav>
        </div>
      )}
    </header>
  );
}
