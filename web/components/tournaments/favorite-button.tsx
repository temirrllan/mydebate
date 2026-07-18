"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/lib/actions/favorites";
import { cn } from "@/lib/utils";

/**
 * ❤️-тоггл избранного — точка расширения `favoriteSlot` карточки турнира
 * (components/tournaments/tournament-card.tsx) и hero детали турнира.
 * Оптимистичное обновление: сразу меняем локальный вид, откатываем при
 * ошибке сервера (страница и так auth-gated через proxy.ts, поэтому "гостя"
 * здесь по факту не бывает, но результат `{ok:false}` всё равно обрабатываем
 * защитно).
 */
export function FavoriteButton({
  tournamentId,
  initialFavorited = false,
  className,
}: {
  tournamentId: string;
  initialFavorited?: boolean;
  className?: string;
}) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const next = !favorited;
    setFavorited(next);

    startTransition(async () => {
      const result = await toggleFavorite(tournamentId);
      if (!result.ok) {
        setFavorited(!next);
        return;
      }
      setFavorited(result.favorited);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "Убрать из избранного" : "Добавить в избранное"}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-400 shadow-sm backdrop-blur transition-all hover:scale-105 hover:text-rose-500 disabled:pointer-events-none disabled:opacity-70",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        favorited && "text-rose-500",
        className,
      )}
    >
      <Heart size={18} fill={favorited ? "currentColor" : "none"} strokeWidth={2} />
    </button>
  );
}
