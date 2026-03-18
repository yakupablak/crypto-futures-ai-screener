import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";

type HeaderStat = {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
};

type HeaderChip = {
  label: string;
  tone?: "neutral" | "success" | "danger" | "warning";
};

export function PageHeader({
  eyebrow,
  title,
  description,
  stats = [],
  chips = [],
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  stats?: HeaderStat[];
  chips?: HeaderChip[];
  actions?: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,154,71,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(45,209,143,0.08),transparent_24%)]" />
      <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl space-y-5">
          {chips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Badge key={chip.label} tone={chip.tone}>
                  {chip.label}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.34em] text-accent">{eyebrow}</p>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.03em] text-text md:text-4xl">
              {title}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted md:text-[15px]">{description}</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 xl:max-w-[540px]">
          {actions ? <div className="soft-panel rounded-[28px] p-4">{actions}</div> : null}
          {stats.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {stats.map((stat) => (
                <MetricTile
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  hint={stat.hint}
                  tone={stat.tone}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
