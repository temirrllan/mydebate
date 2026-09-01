import { Container } from "@/components/ui/container";

/** Скелетон детали турнира (Next.js `loading.tsx`). */
export default function TournamentDetailLoading() {
  return (
    <>
      <section className="bg-navy-900">
        <Container className="py-10 sm:py-14" aria-busy="true" aria-live="polite">
          <div className="h-4 w-56 animate-pulse rounded bg-white/10" />
          <div className="mt-6 h-6 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="mt-4 h-9 w-80 animate-pulse rounded bg-white/10" />
          <div className="mt-4 h-5 w-64 animate-pulse rounded bg-white/10" />
          <div className="mt-8 h-11 w-44 animate-pulse rounded-lg bg-white/10" />
        </Container>
      </section>
      <Container className="grid gap-8 py-10 lg:grid-cols-3 lg:py-14">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-48 animate-pulse rounded-[var(--radius-card)] border border-line bg-canvas" />
          <div className="h-32 animate-pulse rounded-[var(--radius-card)] border border-line bg-canvas" />
        </div>
        <div className="space-y-6">
          <div className="h-72 animate-pulse rounded-[var(--radius-card)] border border-line bg-canvas" />
          <div className="h-40 animate-pulse rounded-[var(--radius-card)] border border-line bg-canvas" />
        </div>
      </Container>
    </>
  );
}
