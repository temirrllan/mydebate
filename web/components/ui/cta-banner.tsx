import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Navy-блок финального CTA — переиспользуется на Главной и странице «О нас».
 * `children` — кнопки действия (обычно 1–2 шт.).
 */
export function CtaBanner({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] bg-navy-900 p-8 sm:p-10",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle,#ffffff_1.5px,transparent_1.5px)] [background-size:20px_20px]"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Icon size={28} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white sm:text-2xl">{title}</h2>
            <p className="mt-1 text-sm text-white/70 sm:text-base">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">{children}</div>
      </div>
    </div>
  );
}
