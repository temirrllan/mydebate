import Image from "next/image";
import Link from "next/link";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FORMAT_LABEL, LEVEL_LABEL, formatDateRu, isRegistrationOpen } from "@/lib/format";

export type TournamentCardData = {
  id: string;
  title: string;
  city: string | null;
  startDate: Date | string;
  registrationDeadline: Date | string;
  format: string;
  level: string | null;
  /** Путь к загруженной обложке (`/uploads/tournaments/...`) — не задана
   * почти у всех сидовых турниров, поэтому карточка держит градиент-заглушку
   * как fallback (см. рендер ниже, продуктовая недоделка #12). */
  coverImage?: string | null;
};

/**
 * Карточка турнира — переиспользуемый примитив (Главная «Ближайшие турниры»,
 * каталог турниров в Этапе 4). `favoriteSlot` — точка расширения под ❤️-тоггл
 * избранного (auth-зависимая интерактивность, добавляется в Этапе 4 —
 * `components/tournaments/favorite-button.tsx` пока не существует, рендерить
 * сюда как children/prop, не переписывая саму карточку).
 */
export function TournamentCard({
  tournament,
  favoriteSlot,
}: {
  tournament: TournamentCardData;
  favoriteSlot?: React.ReactNode;
}) {
  const open = isRegistrationOpen(tournament.registrationDeadline);

  return (
    <Card className="group flex flex-col overflow-hidden transition-shadow hover:shadow-lg hover:shadow-navy-900/5">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-navy-800 to-brand-600">
        {tournament.coverImage ? (
          <Image
            src={tournament.coverImage}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle,#ffffff_1.5px,transparent_1.5px)] [background-size:16px_16px]"
            aria-hidden="true"
          />
        )}
        <Badge tone={open ? "green" : "gray"} className="absolute left-3 top-3">
          {open ? "Регистрация открыта" : "Регистрация завершена"}
        </Badge>
        {favoriteSlot && <div className="absolute right-3 top-3">{favoriteSlot}</div>}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 font-semibold text-ink">{tournament.title}</h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={15} className="shrink-0 text-brand-600" />
            {tournament.city ?? "Онлайн"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={15} className="shrink-0 text-brand-600" />
            {formatDateRu(tournament.startDate)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="blue">{FORMAT_LABEL[tournament.format] ?? tournament.format}</Badge>
          {tournament.level && (
            <Badge tone="purple">{LEVEL_LABEL[tournament.level] ?? tournament.level}</Badge>
          )}
        </div>

        <div className="mt-auto pt-5">
          <Button asChild variant="outline" size="sm">
            <Link href={`/tournaments/${tournament.id}`}>
              Подробнее <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
