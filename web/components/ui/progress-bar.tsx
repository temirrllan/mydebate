import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * Шаг — только КЛЮЧ подписи. Сам текст берётся из словаря: `<key>` —
 * заголовок шага, `<key>Hint` — пояснение под ним.
 */
export type ProgressStep = {
  key: string;
};

/**
 * Прогресс-бар шагов мастера (номера + подписи, шаг активен/пройден/впереди).
 * `currentStep` — 1-based.
 *
 * Подписи компонент берёт из namespace "createTournament" — единственного
 * места, где он используется. Если прогресс-бар понадобится где-то ещё,
 * namespace стоит вынести в проп, а не плодить ключи шагов в чужом словаре.
 */
export function ProgressBar({
  steps,
  currentStep,
  className,
}: {
  steps: ProgressStep[];
  currentStep: number;
  className?: string;
}) {
  const t = useTranslations("createTournament");

  return (
    <div className={cn("w-full", className)}>
      <ol className="flex items-start" aria-label={t("stepsLabel")}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const done = stepNumber < currentStep;
          const active = stepNumber === currentStep;

          return (
            <li key={step.key} className="flex flex-1 items-start last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors sm:h-10 sm:w-10",
                    done && "bg-brand-600 text-white",
                    active && "bg-brand-600 text-white ring-4 ring-brand-100",
                    !done && !active && "border-2 border-line bg-white text-muted",
                  )}
                >
                  {done ? <Check size={17} /> : stepNumber}
                </span>
                <div className="mt-2 hidden text-center sm:block">
                  <p className={cn("text-xs font-semibold", active || done ? "text-navy-900" : "text-muted")}>
                    {t(step.key)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">{t(`${step.key}Hint`)}</p>
                </div>
              </div>
              {stepNumber < steps.length && (
                <div
                  className={cn("mt-[18px] h-0.5 flex-1 sm:mt-5", done ? "bg-brand-600" : "bg-line")}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-center text-sm font-medium text-navy-900 sm:hidden">
        {t("stepOf", {
          current: currentStep,
          total: steps.length,
          label: t(steps[currentStep - 1]?.key ?? ""),
        })}
      </p>
    </div>
  );
}
