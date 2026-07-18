import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Пустое состояние — переиспользуемый примитив (spec §8: "Every page has
 * all four states"). Пример: «Пока нет опубликованных турниров.»
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line bg-canvas px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Icon size={22} />
        </div>
      )}
      <p className="mt-4 text-base font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
