/** Скелетон загрузки списка организаторов (Next.js `loading.tsx`). */
export default function OrganizersLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="h-6 w-40 animate-pulse rounded bg-line/60" />
      <div className="mt-2 h-4 w-96 animate-pulse rounded bg-line/40" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-[var(--radius-card)] border border-line bg-white" />
        ))}
      </div>
    </div>
  );
}
