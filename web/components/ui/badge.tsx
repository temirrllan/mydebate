import { cn } from "@/lib/utils";

type Tone =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "gray"
  | "navy"
  | "red";

const tones: Record<Tone, string> = {
  blue: "bg-brand-50 text-brand-700",
  green: "bg-emerald-50 text-emerald-700",
  orange: "bg-amber-50 text-amber-700",
  purple: "bg-violet-50 text-violet-700",
  gray: "bg-slate-100 text-slate-600",
  navy: "bg-navy-900 text-white",
  red: "bg-rose-50 text-rose-600",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "blue", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
