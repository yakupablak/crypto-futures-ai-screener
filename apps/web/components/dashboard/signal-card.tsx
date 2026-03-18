import Link from "next/link";
import { ArrowRight, Shield, TrendingDown, TrendingUp } from "lucide-react";

import type { SignalSnapshot } from "@crypto-futures/shared";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { formatPercent, formatPrice, formatSetupLabel } from "@/lib/utils";

export function SignalCard({ signal }: { signal: SignalSnapshot }) {
  const isLong = signal.side === "LONG";
  const TrendIcon = isLong ? TrendingUp : TrendingDown;

  return (
    <Card className="flex h-full flex-col overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${
                isLong
                  ? "border-success/20 bg-success/10 text-success"
                  : "border-danger/20 bg-danger/10 text-danger"
              }`}
            >
              <TrendIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xl font-semibold text-text">{signal.symbol}</h3>
              <p className="mt-1 text-sm text-muted">{signal.coinName}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={isLong ? "success" : "danger"}>{signal.side}</Badge>
            <Badge tone="neutral">{formatSetupLabel(signal.setup)}</Badge>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Skor</p>
          <p className="mt-2 text-2xl font-semibold text-text">{signal.score.toFixed(1)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricTile label="Entry" value={formatPrice(signal.entry)} />
        <MetricTile label="Stop" value={formatPrice(signal.stop)} tone="danger" />
        <MetricTile label="TP1" value={formatPrice(signal.tp1)} tone="success" />
        <MetricTile label="TP2" value={formatPrice(signal.tp2)} tone="success" />
        <MetricTile label="Risk / Odul" value={signal.riskReward.toFixed(2)} tone="accent" />
        <MetricTile label="Trend" value={signal.trend} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="soft-panel rounded-[24px] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Funding</p>
          <p className="mt-2 font-semibold text-text">
            {formatPercent(
              signal.marketMetrics.latestFundingRate
                ? signal.marketMetrics.latestFundingRate * 100
                : 0,
            )}
          </p>
        </div>
        <div className="soft-panel rounded-[24px] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">OI Trend</p>
          <p className="mt-2 font-semibold text-text">
            {formatPercent(signal.marketMetrics.openInterestTrendPct)}
          </p>
        </div>
        <div className="soft-panel rounded-[24px] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Guven</p>
          <p className="mt-2 font-semibold text-text">{Math.round(signal.confidence * 100)}%</p>
        </div>
      </div>

      <div className="mt-5 rounded-[26px] border border-white/8 bg-black/20 p-4">
        <div className="flex items-center gap-2 text-text">
          <Shield className="h-4 w-4 text-accent" />
          <p className="text-sm font-medium">Analiz Ozeti</p>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted">{signal.summary}</p>
      </div>

      {signal.reasons.length > 0 ? (
        <div className="mt-4 space-y-2">
          {signal.reasons.slice(0, 2).map((reason) => (
            <div
              key={reason}
              className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-muted"
            >
              {reason}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-auto pt-5">
        <Link
          href={`/signals/${signal.id}`}
          className="inline-flex w-full items-center justify-between rounded-[18px] border border-accent/60 bg-accent px-4 py-3 text-sm font-semibold text-[#1b120a] transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
        >
          <span>Sinyal detayina git</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}
