import { formatDistanceToNowStrict } from "date-fns";

import type { DashboardData } from "@/lib/repository/types";

import { PageHeader } from "@/components/ui/page-header";
import { formatPercent, formatRMultiple } from "@/lib/utils";

export function DashboardHero({ data }: { data: DashboardData }) {
  const openTrades = data.trades.filter((trade) => trade.status === "OPEN").length;
  const closedTrades = data.trades.filter((trade) => trade.status === "CLOSED");
  const winRate =
    closedTrades.length === 0
      ? 0
      : (closedTrades.filter((trade) => (trade.realizedPnlPct ?? 0) > 0).length /
          closedTrades.length) *
        100;
  const bestSignal = data.signals[0];

  return (
    <PageHeader
      eyebrow="Screener Dashboard"
      title="En guclu sinyalleri, aktif trade'leri ve son tarama nabzini tek bakista gor."
      description="Binance USDT perpetual evreni, deterministik futures kurallari ve AI destekli trade hafizasi ayni kontrol katmaninda birlesiyor."
      chips={[
        { label: "Top 200 + Whitelist", tone: "warning" },
        ...(bestSignal ? [{ label: `Lider: ${bestSignal.symbol}`, tone: "success" as const }] : []),
      ]}
      stats={[
        {
          label: "Son Tarama",
          value: data.latestScan
            ? formatDistanceToNowStrict(new Date(data.latestScan.completedAt), {
                addSuffix: true,
              })
            : "Henuz yok",
          hint: `${data.latestScan?.scannedSymbols ?? 0} coin tarandi`,
          tone: "accent",
        },
        {
          label: "Aktif Sinyal",
          value: data.signals.length.toString(),
          hint: `${data.latestScan?.shortlistedSymbols ?? 0} aday shortlist'e girdi`,
        },
        {
          label: "Canli Expectancy",
          value: formatRMultiple(data.performance?.expectancyR ?? null),
          hint:
            data.performance != null
              ? `${data.performance.totalClosedTrades} kapali trade, PF ${data.performance.profitFactor?.toFixed(2) ?? "-"}`
              : `${closedTrades.length} kapanmis islem hafizada`,
          tone:
            (data.performance?.expectancyR ?? 0) > 0
              ? "success"
              : data.performance
                ? "warning"
                : "neutral",
        },
        {
          label: "Walk-Forward Test",
          value:
            data.walkForward != null
              ? formatRMultiple(data.walkForward.testExpectancyR)
              : `${winRate.toFixed(0)}%`,
          hint:
            data.walkForward != null
              ? `${data.walkForward.testSignals} out-of-sample signal, WR ${formatPercent(data.walkForward.testWinRate)}`
              : `${data.aiReviews.length} AI review mevcut, ${openTrades} acik trade`,
          tone:
            (data.walkForward?.testExpectancyR ?? 0) > 0
              ? "success"
              : data.walkForward
                ? "warning"
                : winRate >= 50
                  ? "success"
                  : "warning",
        },
      ]}
    />
  );
}
