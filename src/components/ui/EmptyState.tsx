export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <h3 className="font-display font-bold text-lg text-navy mb-1.5">{title}</h3>
      <p className="font-body text-sm text-ink-muted max-w-xs">{description}</p>
    </div>
  );
}
