import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "orange" | "gray" | "red" | "navy";

const ICON_BG: Record<Tone, string> = {
  blue: "bg-brand-50 text-brand-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-amber-50 text-amber-600",
  gray: "bg-slate-100 text-slate-600",
  red: "bg-rose-50 text-rose-600",
  navy: "bg-navy-900 text-white",
};

const ACCENT_BORDER: Record<Tone, string> = {
  blue: "border-brand-200",
  green: "border-emerald-200",
  orange: "border-amber-300",
  gray: "border-line",
  red: "border-rose-300",
  navy: "border-navy-300",
};

/**
 * Карточка-счётчик дашборда админки (app/admin/page.tsx) — опционально
 * ссылка в соответствующий раздел (`href`) и акцентная рамка для
 * показателей, требующих внимания (`accent`, напр. «на модерации»/«открытых
 * обращений»).
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  href,
  tone = "blue",
  accent = false,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href?: string;
  tone?: Tone;
  accent?: boolean;
  className?: string;
}) {
  const body = (
    <Card
      className={cn(
        "animate-fade-in p-5 transition-shadow",
        href && "hover:shadow-md hover:border-brand-200",
        accent && "border-2",
        accent && ACCENT_BORDER[tone],
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", ICON_BG[tone])}>
          <Icon size={20} strokeWidth={1.8} />
        </span>
        {href && <ArrowRight size={16} className="text-muted" aria-hidden="true" />}
      </div>
      <p className="mt-4 text-3xl font-extrabold text-navy-900">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </Card>
  );

  if (!href) return body;

  return (
    <Link
      href={href}
      className="block rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      {body}
    </Link>
  );
}
