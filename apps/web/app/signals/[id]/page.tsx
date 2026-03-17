import { notFound } from "next/navigation";

import { LevelsChart } from "@/components/charts/levels-chart";
import { SelectTradeButton } from "@/components/trades/select-trade-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { getRepository } from "@/lib/repository";
import { formatPercent, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repository = getRepository();
  const signal = await repository.getSignalById(id);

  if (!signal) {
    notFound();
  }

  return (
    <div className="space-y-6 pb-10">
      <Card className="p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={signal.side === "LONG" ? "success" : "danger"}>
                {signal.side}
              </Badge>
              <Badge tone="neutral">{signal.setup.replaceAll("_", " ")}</Badge>
              <Badge tone="neutral">Score {signal.score.toFixed(1)}</Badge>
            </div>
            <SectionTitle
              eyebrow={signal.coinName}
              title={`${signal.symbol} için işlem planı`}
              description={signal.summary}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Entry" value={formatPrice(signal.entry)} />
            <Metric label="Stop" value={formatPrice(signal.stop)} />
            <Metric label="TP1" value={formatPrice(signal.tp1)} />
            <Metric label="TP2" value={formatPrice(signal.tp2)} />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="p-5">
          <SectionTitle
            eyebrow="Execution Map"
            title="Fiyat seviyeleri"
            description="Chart preview, entry/stop/target seviyelerini hızlı okumak için üretilir."
          />
          <div className="mt-6">
            <LevelsChart
              entry={signal.entry}
              stop={signal.stop}
              tp1={signal.tp1}
              tp2={signal.tp2}
            />
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle
              eyebrow="Trade Selection"
              title="Journale gönder"
              description="Bu sinyali seçtiğinde trade geçmişine açılış kaydı düşer."
            />
            <div className="mt-5">
              <SelectTradeButton signalId={signal.id} />
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle
              eyebrow="Confluence"
              title="Teknik özet"
              description="Setup'ın hangi kurallarla desteklendiğini hızlı gör."
            />
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <Metric label="Trend" value={signal.trend} />
              <Metric label="RR" value={signal.riskReward.toFixed(2)} />
              <Metric label="RSI" value={signal.technicalSnapshot.rsi.toFixed(2)} />
              <Metric label="Volume Ratio" value={signal.technicalSnapshot.volumeRatio.toFixed(2)} />
              <Metric
                label="Funding"
                value={formatPercent(
                  signal.marketMetrics.latestFundingRate
                    ? signal.marketMetrics.latestFundingRate * 100
                    : 0,
                )}
              />
              <Metric
                label="OI Trend"
                value={formatPercent(signal.marketMetrics.openInterestTrendPct)}
              />
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <SectionTitle
          eyebrow="Reasons"
          title="Analiz özeti"
          description="Sinyal seçiminin altında yatan güçlü gerekçeler."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {signal.reasons.map((reason) => (
            <div
              key={reason}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-muted"
            >
              {reason}
            </div>
          ))}
        </div>
      </Card>
    </div>
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
