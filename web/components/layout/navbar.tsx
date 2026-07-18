"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";
import { logoutUser } from "@/lib/actions/auth";
import { Role } from "@/lib/enums";
import type { CurrentUser } from "@/lib/auth/session";

const NAV = [
  { href: "/", label: "Главная" },
  { href: "/tournaments", label: "Турниры" },
  { href: "/about", label: "О нас" },
  { href: "/contacts", label: "Контакты" },
];

// Пользователь передаётся из app/layout.tsx (Server Component, await
// getCurrentUser()) — навбар сам не обращается к сессии, только рендерит
// то, что получил (spec: "session-aware navbar", баг Этапа 2 исправлен здесь).
type NavbarProps = {
  user: CurrentUser | null;
};

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

export function Navbar({ user }: NavbarProps) {
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
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Действия (десктоп) */}
        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="outline" size="sm">
            <Link href="/tournaments/create">Создать турнир</Link>
          </Button>

          {user ? (
            <>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin">
                    <ShieldCheck size={16} />
                    Админ-панель
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm">
                <Link href="/profile">
                  <Avatar user={user} />
                  {user.firstName}
                </Link>
              </Button>
              <form action={logoutUser}>
                <Button type="submit" variant="outline" size="sm">
                  <LogOut size={16} />
                  Выйти
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Войти</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Регистрация</Link>
              </Button>
            </>
          )}
        </div>

        {/* Бургер */}
        <button
          ref={burgerRef}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Меню"
          aria-expanded={open}
          aria-controls={MOBILE_MENU_ID}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </Container>

      {/* Мобильное меню */}
      {open && (
        <div id={MOBILE_MENU_ID} className="border-t border-line bg-white lg:hidden">
          <nav aria-label="Мобильное меню">
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
                {item.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <Button asChild variant="outline">
                <Link href="/tournaments/create" onClick={closeMenu}>
                  Создать турнир
                </Link>
              </Button>

              {user ? (
                <>
                  {isAdmin && (
                    <Button asChild variant="ghost">
                      <Link href="/admin" onClick={closeMenu}>
                        <ShieldCheck size={16} />
                        Админ-панель
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="ghost">
                    <Link href="/profile" onClick={closeMenu}>
                      <Avatar user={user} />
                      {user.firstName} {user.lastName}
                    </Link>
                  </Button>
                  <form action={logoutUser}>
                    <Button type="submit" variant="outline" className="w-full">
                      <LogOut size={16} />
                      Выйти
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost">
                    <Link href="/login" onClick={closeMenu}>
                      Войти
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register" onClick={closeMenu}>
                      Регистрация
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
