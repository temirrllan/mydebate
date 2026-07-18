import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  wrapperClassName?: string;
}

/** Стилизованный `<select>` в духе Input — используется в фильтрах каталога и форме регистрации. */
export function Select({ className, wrapperClassName, invalid, ...props }: SelectProps) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select
        className={cn(
          "h-11 w-full appearance-none rounded-[var(--radius-btn)] border bg-white pl-3.5 pr-9 text-sm text-ink",
          "transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500",
          invalid ? "border-rose-400 focus:ring-rose-400/30 focus:border-rose-400" : "border-line",
          className,
        )}
        {...props}
      />
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
    </div>
  );
}
