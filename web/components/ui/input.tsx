import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-[var(--radius-btn)] border bg-white px-3.5 text-sm text-ink",
        "placeholder:text-muted transition-colors",
        "focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500",
        invalid
          ? "border-rose-400 focus:ring-rose-400/30 focus:border-rose-400"
          : "border-line",
        className,
      )}
      {...props}
    />
  );
}
