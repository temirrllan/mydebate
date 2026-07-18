import { Container } from "@/components/ui/container";

/** Скелетон мастера создания турнира — показывается автоматически (Next.js `loading.tsx`) во время загрузки страницы. */
export default function CreateTournamentLoading() {
  return (
    <Container className="py-10 sm:py-14" aria-busy="true" aria-live="polite">
      <div className="h-4 w-40 animate-pulse rounded bg-line/60" />
      <div className="mt-4 h-9 w-72 animate-pulse rounded bg-line/60" />
      <div className="mt-2 h-5 w-full max-w-2xl animate-pulse rounded bg-line/50" />

      <div className="mt-8 max-w-3xl space-y-6">
        {/* Прогресс-бар шагов */}
        <div className="flex items-center gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-1 items-center gap-3 last:flex-none">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-line/60" />
              {i < 2 && <div className="h-0.5 flex-1 animate-pulse bg-line/50" />}
            </div>
          ))}
        </div>

        {/* Поля формы шага */}
        <div className="space-y-5 rounded-[var(--radius-card)] border border-line bg-white p-6 sm:p-8">
          <div className="h-5 w-40 animate-pulse rounded bg-line/60" />
          <div className="h-11 animate-pulse rounded-[var(--radius-btn)] bg-line/50" />
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="h-11 animate-pulse rounded-[var(--radius-btn)] bg-line/50" />
            <div className="h-11 animate-pulse rounded-[var(--radius-btn)] bg-line/50" />
          </div>
          <div className="h-24 animate-pulse rounded-[var(--radius-btn)] bg-line/40" />
        </div>

        <div className="flex justify-end">
          <div className="h-11 w-32 animate-pulse rounded-[var(--radius-btn)] bg-line/60" />
        </div>
      </div>
    </Container>
  );
}
