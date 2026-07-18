import Link from "next/link";
import {
  User,
  Trophy,
  ClipboardList,
  Heart,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export type ProfileTab =
  | "overview"
  | "tournaments"
  | "applications"
  | "favorites"
  | "notifications"
  | "settings";

const TABS: { id: ProfileTab; label: string; icon: typeof User }[] = [
  { id: "overview", label: "Профиль", icon: User },
  { id: "tournaments", label: "Мои турниры", icon: Trophy },
  { id: "applications", label: "Мои заявки", icon: ClipboardList },
  { id: "favorites", label: "Избранное", icon: Heart },
  { id: "notifications", label: "Уведомления", icon: Bell },
  { id: "settings", label: "Настройки", icon: Settings },
];

/** Боковое меню личного кабинета (макет "Профиль.png") — вкладки через `?tab=`. */
export function ProfileSidebar({
  active,
  unreadNotificationCount,
}: {
  active: ProfileTab;
  unreadNotificationCount: number;
}) {
  return (
    <Card className="p-3">
      <nav className="flex flex-col gap-1" aria-label="Разделы личного кабинета">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={`/profile?tab=${tab.id}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-canvas hover:text-ink",
              )}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={17} />
                {tab.label}
              </span>
              {tab.id === "notifications" && unreadNotificationCount > 0 && (
                <Badge tone="red" className="px-1.5 py-0.5 text-[11px]">
                  {unreadNotificationCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <form action={logoutUser} className="mt-2 border-t border-line pt-2">
        <Button type="submit" variant="ghost" className="w-full justify-start gap-2.5 text-slate-600">
          <LogOut size={17} />
          Выйти
        </Button>
      </form>
    </Card>
  );
}
