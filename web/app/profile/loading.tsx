import { Container } from "@/components/ui/container";

/** Скелетон личного кабинета — показывается автоматически (Next.js `loading.tsx`) во время загрузки профиля. */
export default function ProfileLoading() {
  return (
    <Container className="py-10 sm:py-14" aria-busy="true" aria-live="polite">
      {/* Navy-шапка (ProfileHeader) */}
      <div className="h-44 animate-pulse rounded-[var(--radius-card)] bg-navy-900/90 sm:h-40" />

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Боковое меню (ProfileSidebar) */}
        <div className="h-72 animate-pulse rounded-[var(--radius-card)] border border-line bg-canvas" />

        {/* Контент вкладки */}
        <div className="min-w-0 space-y-6">
          <div className="space-y-3 rounded-[var(--radius-card)] border border-line bg-white p-6 sm:p-8">
            <div className="h-5 w-48 animate-pulse rounded bg-line/60" />
            <div className="h-16 animate-pulse rounded-lg bg-line/40" />
            <div className="h-16 animate-pulse rounded-lg bg-line/40" />
          </div>
          <div className="space-y-3 rounded-[var(--radius-card)] border border-line bg-white p-6 sm:p-8">
            <div className="h-5 w-40 animate-pulse rounded bg-line/60" />
            <div className="h-16 animate-pulse rounded-lg bg-line/40" />
          </div>
        </div>
      </div>
    </Container>
  );
}
