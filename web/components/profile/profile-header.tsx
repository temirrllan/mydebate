import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Mail, Phone, MapPin, Trophy, Heart, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";


export type ProfileHeaderUser = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  city: string | null;
  bio: string | null;
  image: string | null;
  role: string;
};

/** Navy-шапка личного кабинета (макет "Профиль.png"). */
export async function ProfileHeader({
  user,
  stats,
}: {
  user: ProfileHeaderUser;
  stats: { registrations: number; favorites: number; unreadNotifications: number };
}) {
  const t = await getTranslations("profile");
  const tEnum = await getTranslations("enums");
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] bg-navy-900">
      <div className="relative p-6 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle,#ffffff_1.5px,transparent_1.5px)] [background-size:20px_20px]"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {user.image ? (
              <Image
                src={user.image}
                alt=""
                width={72}
                height={72}
                className="h-[72px] w-[72px] shrink-0 rounded-full object-cover ring-4 ring-white/10"
              />
            ) : (
              <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-white/10 text-xl font-bold text-white ring-4 ring-white/10">
                {initials || "U"}
              </span>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-white sm:text-2xl">
                  {user.firstName} {user.lastName}
                </h1>
                <Badge tone="blue">{tEnum(`role.${user.role}`)}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/70">
                {user.city && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={15} /> {user.city}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={15} /> {user.email}
                </span>
                {user.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={15} /> {user.phone}
                  </span>
                )}
              </div>
              {user.bio && <p className="mt-3 max-w-2xl text-sm text-white/80">{user.bio}</p>}
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="border-white/25 bg-transparent text-white hover:border-white/50 hover:bg-white/10 hover:text-white">
            <Link href="/profile?tab=settings">{t("editProfile")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-white/[0.03]">
        <Stat icon={Trophy} value={stats.registrations} label={t("statApplications")} />
        <Stat icon={Heart} value={stats.favorites} label={t("statFavorites")} />
        <Stat icon={Bell} value={stats.unreadNotifications} label={t("statUnread")} />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Trophy; value: number; label: string }) {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-4 sm:py-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
        <Icon size={18} />
      </div>
      <div className="text-left">
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="text-xs text-white/60">{label}</p>
      </div>
    </div>
  );
}
