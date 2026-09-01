import { Container } from "@/components/ui/container";

/** Скелетон каталога — показывается автоматически (Next.js `loading.tsx`) во время загрузки данных страницы. */
export default function TournamentsLoading() {
  return (
    <Container className="py-10 sm:py-14" aria-busy="true" aria-live="polite">
      <div className="h-4 w-40 animate-pulse rounded bg-line/60" />
      <div className="mt-4 h-9 w-64 animate-pulse rounded bg-line/60" />
      <div className="mt-2 h-5 w-80 animate-pulse rounded bg-line/50" />

      <div className="mt-8 h-24 animate-pulse rounded-[var(--radius-card)] border border-line bg-canvas" />

      <div className="mt-6 h-4 w-32 animate-pulse rounded bg-line/50" />

      <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-[var(--radius-card)] border border-line">
            <div className="h-40 animate-pulse bg-line/50" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded bg-line/60" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-line/40" />
              <div className="h-8 w-24 animate-pulse rounded bg-line/40" />
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
