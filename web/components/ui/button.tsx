import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "dark";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20",
  secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  outline:
    "border border-line bg-white text-ink hover:border-brand-300 hover:text-brand-700",
  ghost: "text-ink hover:bg-brand-50 hover:text-brand-700",
  dark: "bg-navy-900 text-white hover:bg-navy-800",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-13 px-7 text-base gap-2.5",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    React.RefAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        // whitespace-nowrap: подпись кнопки не должна ломаться по словам. На
        // русском это почти не проявлялось, а на казахском «Турнир құру» и
        // «Әкімші панелі» разъезжались на две строки и ломали высоту шапки.
        "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-btn)] font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
