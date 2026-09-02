import type { Metadata } from "next";
import {
  Users,
  UserCog,
  Trophy,
  ClipboardList,
  Clock,
  CheckCircle2,
  EyeOff,
  XCircle,
  LifeBuoy,
  AlertTriangle,
} from "lucide-react";
import { getAdminDashboardStats } from "@/lib/admin/queries";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("overviewTitle") };
}

export default async function AdminOverviewPage() {
  const t = await getTranslations("admin");
  let stats;
  let loadError = false;
  try {
    stats = await getAdminDashboardStats();
  } catch (error) {
    console.error("[admin] Не удалось загрузить статистику дашборда:", error);
    loadError = true;
  }

  if (loadError || !stats) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t("loadErrorTitle")}
        description={t("loadErrorText")}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-navy-900">{t("overviewTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("overviewIntro")}</p>
      </div>

      {/* Акцент на показателях, требующих действий администратора. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={Clock}
          label={t("statPending")}
          value={stats.tournamentsPending}
          tone="orange"
          accent
          href="/admin/moderation?status=PENDING"
        />
        <StatCard
          icon={LifeBuoy}
          label={t("statOpenTickets")}
          value={stats.openTickets}
          tone="red"
          accent
          href="/admin/support?status=OPEN"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label={t("statUsers")} value={stats.totalUsers} tone="blue" href="/admin/users" />
        <StatCard
          icon={UserCog}
          label={t("statOrganizers")}
          value={stats.totalOrganizers}
          tone="blue"
          href="/admin/organizers"
        />
        <StatCard
          icon={Trophy}
          label={t("statTournaments")}
          value={stats.totalTournaments}
          tone="navy"
          href="/admin/moderation?status=ALL"
        />
        <StatCard icon={ClipboardList} label={t("statRegistrations")} value={stats.totalRegistrations} tone="gray" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={CheckCircle2}
          label={t("statPublished")}
          value={stats.tournamentsPublished}
          tone="green"
          href="/admin/moderation?status=PUBLISHED"
        />
        <StatCard
          icon={EyeOff}
          label={t("statHidden")}
          value={stats.tournamentsHidden}
          tone="gray"
          href="/admin/moderation?status=HIDDEN"
        />
        <StatCard
          icon={XCircle}
          label={t("statRejected")}
          value={stats.tournamentsRejected}
          tone="red"
          href="/admin/moderation?status=REJECTED"
        />
      </div>
    </div>
  );
}
