import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Пагинация номерами страниц (+ стрелки), сохраняет фильтры в URL — вызывающая
 * страница передаёт `buildHref(page)` (обычно собирает `URLSearchParams` из
 * текущих searchParams, меняя только `page`). Обычные `<Link>` — переход без
 * полной перезагрузки (App Router client navigation).
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
  className,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const pages = buildPageList(page, totalPages);

  return (
    <nav aria-label="Пагинация" className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
      <Link
        href={buildHref(Math.max(1, page - 1))}
        aria-label="Предыдущая страница"
        aria-disabled={page === 1}
        tabIndex={page === 1 ? -1 : undefined}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:border-brand-300 hover:text-brand-700",
          page === 1 && "pointer-events-none opacity-40",
        )}
      >
        <ChevronLeft size={18} />
      </Link>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} className="px-1.5 text-sm text-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              p === page
                ? "bg-brand-600 text-white"
                : "border border-line text-ink hover:border-brand-300 hover:text-brand-700",
            )}
          >
            {p}
          </Link>
        ),
      )}

      <Link
        href={buildHref(Math.min(totalPages, page + 1))}
        aria-label="Следующая страница"
        aria-disabled={page === totalPages}
        tabIndex={page === totalPages ? -1 : undefined}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:border-brand-300 hover:text-brand-700",
          page === totalPages && "pointer-events-none opacity-40",
        )}
      >
        <ChevronRight size={18} />
      </Link>
    </nav>
  );
}

function buildPageList(current: number, total: number): (number | "…")[] {
  const pages: (number | "…")[] = [1];
  const windowSize = 1;

  if (current - windowSize > 2) pages.push("…");

  for (let p = Math.max(2, current - windowSize); p <= Math.min(total - 1, current + windowSize); p++) {
    pages.push(p);
  }

  if (current + windowSize < total - 1) pages.push("…");
  if (total > 1) pages.push(total);

  return pages;
}
