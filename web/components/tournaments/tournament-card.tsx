import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CoverPlaceholder } from "@/components/tournaments/cover-placeholder";
import { formatDate, isRegistrationOpen } from "@/lib/format";

export type TournamentCardData = {
  id: string;
  title: string;
  city: string | null;
  startDate: Date | string;
  registrationDeadline: Date | string;
  format: string;
  level: string | null;
  /** Путь к загруженной обложке (`/uploads/tournaments/...`). Если организатор
   * её не загрузил — рисуем `CoverPlaceholder`: градиент по id + монограмма,
   * чтобы карточка не выглядела как «картинка не подгрузилась». */
  coverImage?: string | null;
};

/**
 * Карточка турнира — переиспользуемый примитив (Главная «Ближайшие турниры»,
 * каталог турниров в Этапе 4). `favoriteSlot` — точка расширения под ❤️-тоггл
 * избранного (auth-зависимая интерактивность, добавляется в Этапе 4 —
 * `components/tournaments/favorite-button.tsx` пока не существует, рендерить
 * сюда как children/prop, не переписывая саму карточку).
 *
 * Кликабельна вся карточка, а не только кнопка «Подробнее». Сделано приёмом
 * «stretched link»: ссылка стоит на заголовке (её и читает скринридер, и
 * копирует «копировать адрес ссылки»), а её псевдоэлемент `::after`
 * растянут на всю карточку — та `relative`. Обёртывать карточку целиком в
 * <a> нельзя: внутри есть своя интерактивность (сердечко избранного,
 * кнопка «Подробнее»), а вложенные интерактивные элементы — невалидный
 * HTML и ломают навигацию с клавиатуры.
 *
 * Поэтому всё, что должно оставаться нажимаемым поверх растянутой ссылки,
 * поднято `relative z-10` (сердечко) — иначе накрывающий слой перехватил бы
 * клик и вместо добавления в избранное открывал турнир.
 */
export function TournamentCard({
  tournament,
  favoriteSlot,
}: {
  tournament: TournamentCardData;
  favoriteSlot?: React.ReactNode;
}) {
  const t = useTranslations("tournamentCard");
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const tEnum = useTranslations("enums");
  const open = isRegistrationOpen(tournament.registrationDeadline);

  return (
    <Card className="group relative flex flex-col overflow-hidden transition-shadow hover:shadow-lg hover:shadow-navy-900/5 focus-within:ring-2 focus-within:ring-brand-500/40">
      <div className="relative h-40 overflow-hidden bg-navy-800">
        {tournament.coverImage ? (
          <Image
            src={tournament.coverImage}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <CoverPlaceholder seed={tournament.id} title={tournament.title} />
        )}
        <Badge tone={open ? "green" : "gray"} className="absolute left-3 top-3">
          {open ? t("registrationOpen") : t("registrationClosed")}
        </Badge>
        {favoriteSlot && <div className="absolute right-3 top-3 z-10">{favoriteSlot}</div>}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 font-semibold text-ink">
          <Link
            href={`/tournaments/${tournament.id}`}
            className="outline-none transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-brand-700"
          >
            {tournament.title}
          </Link>
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={15} className="shrink-0 text-brand-600" />
            {tournament.city ?? tCommon("online")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={15} className="shrink-0 text-brand-600" />
            {formatDate(tournament.startDate, locale)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="blue">{tEnum(`format.${tournament.format}`)}</Badge>
          {tournament.level && (
            <Badge tone="purple">{tEnum(`level.${tournament.level}`)}</Badge>
          )}
        </div>

        {/* Ведёт туда же, куда и вся карточка, — остаётся как явный призыв
            к действию для тех, кто ищет глазами кнопку. */}
        <div className="mt-auto pt-5">
          <Button asChild variant="outline" size="sm" className="relative">
            <Link href={`/tournaments/${tournament.id}`} tabIndex={-1} aria-hidden="true">
              {t("details")} <ArrowRight size={16} />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
