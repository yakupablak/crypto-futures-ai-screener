import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

import type { SignalSnapshot } from "@crypto-futures/shared";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatPercent, formatPrice } from "@/lib/utils";

export function SignalCard({ signal }: { signal: SignalSnapshot }) {
  const isLong = signal.side === "LONG";
  const TrendIcon = isLong ? TrendingUp : TrendingDown;

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendIcon className={isLong ? "h-4 w-4 text-success" : "h-4 w-4 text-danger"} />
            <h3 className="text-xl font-semibold">{signal.symbol}</h3>
          </div>
          <p className="mt-1 text-sm text-muted">{signal.coinName}</p>
        </div>
        <Badge tone={isLong ? "success" : "danger"}>{signal.side}</Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <Metric label="Setup" value={signal.setup.replaceAll("_", " ")} />
        <Metric label="Score" value={signal.score.toFixed(1)} />
        <Metric label="Entry" value={formatPrice(signal.entry)} />
        <Metric label="Stop" value={formatPrice(signal.stop)} />
        <Metric label="TP1" value={formatPrice(signal.tp1)} />
        <Metric label="TP2" value={formatPrice(signal.tp2)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="neutral">RR {signal.riskReward.toFixed(2)}</Badge>
        <Badge tone="neutral">Funding {formatPercent(signal.marketMetrics.latestFundingRate ? signal.marketMetrics.latestFundingRate * 100 : 0)}</Badge>
        <Badge tone="neutral">OI {formatPercent(signal.marketMetrics.openInterestTrendPct)}</Badge>
      </div>

      <p className="mt-4 text-sm leading-6 text-muted">{signal.summary}</p>

      <div className="mt-auto pt-5">
        <Link
          href={`/signals/${signal.id}`}
          className="inline-flex w-full items-center justify-between rounded-full bg-accent px-4 py-2 text-sm font-semibold text-[#1b120a] transition hover:brightness-110"
        >
          <span>Sinyal detayini ac</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 font-medium text-text">{value}</p>
    </div>
  );
}
