/** Скелетон загрузки списка обращений (Next.js `loading.tsx`). */
export default function SupportLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="h-6 w-56 animate-pulse rounded bg-line/60" />
      <div className="mt-2 h-4 w-96 animate-pulse rounded bg-line/40" />
      <div className="mt-5 h-11 w-64 animate-pulse rounded-[var(--radius-btn)] bg-line/50" />
      <div className="mt-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-[var(--radius-card)] border border-line bg-white" />
        ))}
      </div>
    </div>
  );
}
