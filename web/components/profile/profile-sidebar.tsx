import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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

// Подписи вкладок — по ключу из словаря (namespace "profile").
const TABS: { id: ProfileTab; key: string; icon: typeof User }[] = [
  { id: "overview", key: "tabOverview", icon: User },
  { id: "tournaments", key: "tabTournaments", icon: Trophy },
  { id: "applications", key: "tabApplications", icon: ClipboardList },
  { id: "favorites", key: "tabFavorites", icon: Heart },
  { id: "notifications", key: "tabNotifications", icon: Bell },
  { id: "settings", key: "tabSettings", icon: Settings },
];

/** Боковое меню личного кабинета (макет "Профиль.png") — вкладки через `?tab=`. */
export async function ProfileSidebar({
  active,
  unreadNotificationCount,
}: {
  active: ProfileTab;
  unreadNotificationCount: number;
}) {
  const t = await getTranslations("profile");

  return (
    <Card className="p-3">
      <nav className="flex flex-col gap-1" aria-label={t("navLabel")}>
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
                {t(tab.key)}
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
          {t("logout")}
        </Button>
      </form>
    </Card>
  );
}
