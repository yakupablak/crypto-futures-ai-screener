export function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.3em] text-accent">{eyebrow}</p>
      <h2 className="text-2xl font-semibold text-text">{title}</h2>
      {description ? <p className="max-w-2xl text-sm text-muted">{description}</p> : null}
    </div>
  );
}
