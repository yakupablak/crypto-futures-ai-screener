import { cn } from "@/lib/utils";

type MetricTone = "neutral" | "accent" | "success" | "warning" | "danger";

const toneMap: Record<MetricTone, string> = {
  neutral: "border-white/10",
  accent: "border-accent/20",
  success: "border-success/25",
  warning: "border-warning/25",
  danger: "border-danger/25",
};

export function MetricTile({
  label,
  value,
  hint,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: MetricTone;
  className?: string;
}) {
  return (
    <div className={cn("metric-panel rounded-[26px] p-4", toneMap[tone], className)}>
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-text">{value}</p>
      {hint ? <p className="mt-2 text-sm leading-6 text-muted">{hint}</p> : null}
    </div>
  );
}
