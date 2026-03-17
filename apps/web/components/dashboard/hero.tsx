import { formatDistanceToNowStrict } from "date-fns";

import type { DashboardData } from "@/lib/repository/types";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";

export function DashboardHero({ data }: { data: DashboardData }) {
  const openTrades = data.trades.filter((trade) => trade.status === "OPEN").length;
  const closedTrades = data.trades.filter((trade) => trade.status === "CLOSED");
  const winRate =
    closedTrades.length === 0
      ? 0
      : (closedTrades.filter((trade) => (trade.realizedPnlPct ?? 0) > 0).length /
          closedTrades.length) *
        100;

  return (
    <Card className="overflow-hidden p-6 md:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-5">
          <Badge tone="warning">Top 200 + Whitelist Scanner</Badge>
          <SectionTitle
            eyebrow="Screener Dashboard"
            title="En güçlü teknik yapı, pump potansiyeli ve risk/ödül dengesini aynı akışta gör."
            description="Binance USDT perpetual evreni, deterministik futures kuralları ve AI destekli trade hafızası tek panelde birleşiyor."
          />
          <div className="flex flex-wrap gap-3 text-sm text-muted">
            <span>
              Son tarama:{" "}
              <strong className="text-text">
                {data.latestScan
                  ? formatDistanceToNowStrict(new Date(data.latestScan.completedAt), {
                      addSuffix: true,
                    })
                  : "Henüz yok"}
              </strong>
            </span>
            <span>•</span>
            <span>
              Tarama evreni: <strong className="text-text">{data.latestScan?.scannedSymbols ?? 0}</strong>
            </span>
            <span>•</span>
            <span>
              Shortlist: <strong className="text-text">{data.latestScan?.shortlistedSymbols ?? 0}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Aktif Sinyal", value: data.signals.length.toString() },
            { label: "Açık Trade", value: openTrades.toString() },
            { label: "Win Rate", value: `${winRate.toFixed(0)}%` },
            { label: "AI Review", value: data.aiReviews.length.toString() },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-white/10 bg-black/20 p-4"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-muted">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-text">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
