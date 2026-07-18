/** Скелетон загрузки дашборда админки (Next.js `loading.tsx`) — тот же паттерн, что и app/tournaments/loading.tsx. */
export default function AdminOverviewLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-[var(--radius-card)] border-2 border-line bg-white" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-[var(--radius-card)] border border-line bg-white" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-[var(--radius-card)] border border-line bg-white" />
        ))}
      </div>
    </div>
  );
}
