export function OrDivider({ label = "или" }: { label?: string }) {
  return (
    <div className="relative flex items-center py-1">
      <div className="h-px flex-1 bg-line" />
      <span className="px-3 text-xs uppercase tracking-wide text-muted">{label}</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}
