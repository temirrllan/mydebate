import Link from "next/link";
import { cn } from "@/lib/utils";

export type BreadcrumbItem = { label: string; href?: string };

/** Хлебные крошки: «Главная / Правила и условия». Последний пункт — текущая страница (без ссылки). */
export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label="Хлебные крошки" className={cn("flex items-center gap-2 text-sm", className)}>
      {items.map((item, i) => (
        <span key={item.href ?? item.label} className="flex items-center gap-2">
          {i > 0 && (
            <span aria-hidden="true" className="text-muted">
              /
            </span>
          )}
          {item.href ? (
            <Link href={item.href} className="text-muted hover:text-brand-600">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-ink" aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
