import { getLocale, getTranslations } from "next-intl/server";
import { Calendar, MapPin, Users, Info, Pencil, UsersRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, getTournamentStatusDisplay } from "@/lib/format";
import { TournamentStatus } from "@/lib/enums";
import type { MyTournamentItem } from "@/lib/tournaments/queries";

/** Строка организованного турнира — вкладка «Мои турниры» (организатор), профиль. */
export async function MyTournamentRow({ tournament }: { tournament: MyTournamentItem }) {
  const t = await getTranslations("profile");
  const tEnum = await getTranslations("enums");
  const locale = await getLocale();

  const statusDisplay = getTournamentStatusDisplay(tournament.status, tournament.rejectionReason);
  const canView = tournament.status === TournamentStatus.PUBLISHED;

  const content = (
    <div className="flex min-w-0 flex-1 items-center gap-4">
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
          <span className="inline-flex items-center gap-1">
            <Users size={14} />{" "}
            {t("applicationsCount", { count: tournament.registrationsCount })}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge tone="blue" className="text-[11px]">
            {tEnum(`format.${tournament.format}`)}
          </Badge>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {canView ? (
          <Link href={`/tournaments/${tournament.id}`} className="flex min-w-0 flex-1">
            {content}
          </Link>
        ) : (
          content
        )}

        <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
          <Badge tone={statusDisplay.tone}>{tEnum(`tournamentStatus.${statusDisplay.key}`)}</Badge>
          {tournament.rejectionReason && (
            <p className="inline-flex max-w-xs items-start gap-1 text-right text-xs text-muted">
              <Info size={13} className="mt-0.5 shrink-0" /> {tournament.rejectionReason}
            </p>
          )}
        </div>
      </div>

      {/* listMyTournaments уже исключает DELETED турниры — обе ссылки
          доступны для любого статуса, отображаемого в этом списке. */}
      <div className="flex flex-wrap gap-2 sm:pl-24">
        <Button asChild size="sm" variant="outline">
          <Link href={`/tournaments/${tournament.id}/edit`}>
            <Pencil size={14} /> {t("edit")}
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/tournaments/${tournament.id}/participants`}>
            <UsersRound size={14} /> {t("participants", { count: tournament.registrationsCount })}
          </Link>
        </Button>
      </div>
    </div>
  );
}

