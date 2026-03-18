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
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-[0.32em] text-accent">{eyebrow}</p>
      <h2 className="text-2xl font-semibold leading-tight tracking-[-0.025em] text-text">
        {title}
      </h2>
      {description ? <p className="max-w-2xl text-sm leading-7 text-muted">{description}</p> : null}
    </div>
  );
}
