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

export const metadata: Metadata = { title: "Обзор" };

export default async function AdminOverviewPage() {
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
        title="Не удалось загрузить данные."
        description="Попробуйте обновить страницу немного позже."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-navy-900">Обзор</h2>
        <p className="mt-1 text-sm text-muted">Сводная статистика платформы.</p>
      </div>

      {/* Акцент на показателях, требующих действий администратора. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={Clock}
          label="Турниров ждёт модерации"
          value={stats.tournamentsPending}
          tone="orange"
          accent
          href="/admin/moderation?status=PENDING"
        />
        <StatCard
          icon={LifeBuoy}
          label="Открытых обращений в поддержку"
          value={stats.openTickets}
          tone="red"
          accent
          href="/admin/support?status=OPEN"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Пользователи" value={stats.totalUsers} tone="blue" href="/admin/users" />
        <StatCard
          icon={UserCog}
          label="Организаторы"
          value={stats.totalOrganizers}
          tone="blue"
          href="/admin/organizers"
        />
        <StatCard
          icon={Trophy}
          label="Турниры всего"
          value={stats.totalTournaments}
          tone="navy"
          href="/admin/moderation?status=ALL"
        />
        <StatCard icon={ClipboardList} label="Заявок на участие" value={stats.totalRegistrations} tone="gray" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={CheckCircle2}
          label="Опубликовано турниров"
          value={stats.tournamentsPublished}
          tone="green"
          href="/admin/moderation?status=PUBLISHED"
        />
        <StatCard
          icon={EyeOff}
          label="Скрыто"
          value={stats.tournamentsHidden}
          tone="gray"
          href="/admin/moderation?status=HIDDEN"
        />
        <StatCard
          icon={XCircle}
          label="Отклонено"
          value={stats.tournamentsRejected}
          tone="red"
          href="/admin/moderation?status=REJECTED"
        />
      </div>
    </div>
  );
}
