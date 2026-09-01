import { getLocale, getTranslations } from "next-intl/server";
import { Calendar, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { REG_STATUS_TONE, formatDate } from "@/lib/format";
import type { ProfileRegistrationItem } from "@/lib/profile/queries";

/** Строка «мой турнир» — используется во вкладках Профиль/Мои турниры/Мои заявки. */
export async function RegistrationRow({
  registration,
  action,
}: {
  registration: ProfileRegistrationItem;
  action?: React.ReactNode;
}) {
  const tEnum = await getTranslations("enums");
  const locale = await getLocale();
  const { tournament } = registration;

  return (
    <div className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <Link href={`/tournaments/${tournament.id}`} className="flex min-w-0 flex-1 items-center gap-4">
        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-navy-800 to-brand-600" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{tournament.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Calendar size={14} /> {formatDate(tournament.startDate, locale)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} /> {tournament.city ?? tEnum(`locationType.${tournament.locationType}`)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge tone="blue" className="text-[11px]">
              {tEnum(`format.${tournament.format}`)}
            </Badge>
            <Badge tone="gray" className="text-[11px]">
              {tEnum(`locationType.${tournament.locationType}`)}
            </Badge>
          </div>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
        <Badge tone={REG_STATUS_TONE[registration.status] ?? "gray"}>
          {tEnum(`regStatus.${registration.status}`)}
        </Badge>
        {action}
      </div>
    </div>
  );
}
