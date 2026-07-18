import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "light" | "dark";

const containerVariants: Record<Variant, string> = {
  light: "bg-gradient-to-br from-brand-50 via-white to-brand-100",
  dark: "bg-gradient-to-br from-navy-900 via-navy-800 to-brand-700",
};

const dotVariants: Record<Variant, string> = {
  light:
    "opacity-40 [background-image:radial-gradient(circle,var(--color-brand-300)_1.5px,transparent_1.5px)]",
  dark: "opacity-20 [background-image:radial-gradient(circle,#ffffff_1.5px,transparent_1.5px)]",
};

const iconBoxVariants: Record<Variant, string> = {
  light: "bg-white/80 text-brand-600 shadow-brand-900/10",
  dark: "bg-white/10 text-white",
};

/**
 * Плейсхолдер-иллюстрация для секций без реальных ассетов (макеты используют
 * фото/3D-рендеры, которых у нас нет) — градиент + декоративная сетка точек +
 * скруглённый блок с lucide-иконкой в центре. Переиспользуется на Hero-блоках
 * Главной/О нас/Помощи/Правил/Контактов.
 */
export function IllustrationPanel({
  icon: Icon,
  variant = "light",
  className,
  iconClassName,
}: {
  icon: LucideIcon;
  variant?: Variant;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative isolate flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[var(--radius-card)]",
        containerVariants[variant],
        className,
      )}
    >
      <div
        className={cn("absolute inset-0 [background-size:22px_22px]", dotVariants[variant])}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative flex h-24 w-24 items-center justify-center rounded-3xl shadow-lg backdrop-blur sm:h-28 sm:w-28",
          iconBoxVariants[variant],
        )}
      >
        <Icon
          className={cn("h-12 w-12 sm:h-14 sm:w-14", iconClassName)}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
