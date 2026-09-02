import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Логотип MyDebate: марка «M» в виде двух трибун + текстовый знак.
 * variant="light" — для тёмного фона (белый текст).
 */
export function Logo({
  className,
  variant = "dark",
  href = "/",
}: {
  className?: string;
  variant?: "dark" | "light";
  href?: string | null;
}) {
  const mark = (
    <span className="inline-flex items-center gap-2.5">
      <svg
        viewBox="0 0 40 40"
        className="h-9 w-9 shrink-0"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 34V8.5C4 7.12 5.12 6 6.5 6H9c1.38 0 2.5 1.12 2.5 2.5v0c0 .9.48 1.74 1.26 2.2L20 15l7.24-4.3c.78-.46 1.26-1.3 1.26-2.2v0C28.5 7.12 29.62 6 31 6h2.5C34.88 6 36 7.12 36 8.5V34h-7V19l-9 5.4L11 19v15H4Z"
          className={variant === "light" ? "fill-white" : "fill-navy-900"}
        />
      </svg>
      <span
        className={cn(
          "text-lg font-extrabold tracking-tight",
          variant === "light" ? "text-white" : "text-navy-900",
        )}
      >
        MY<span className="text-brand-600">DEBATE</span>
      </span>
    </span>
  );

  if (href === null) return mark;
  return (
    <Link href={href} className={cn("inline-flex shrink-0", className)}>
      {mark}
    </Link>
  );
}
