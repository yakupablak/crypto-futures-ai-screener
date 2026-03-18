import { notFound } from "next/navigation";

import { LevelsChart } from "@/components/charts/levels-chart";
import { SelectTradeButton } from "@/components/trades/select-trade-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/section-title";
import { getRepository } from "@/lib/repository";
import { formatPercent, formatPrice, formatSetupLabel } from "@/lib/utils";

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
    <div className="page-section pb-10">
      <PageHeader
        eyebrow="Signal Detail"
        title={`${signal.symbol} icin karar paneli`}
        description="Entry, stop, hedefler, teknik teyitler ve trade secim notu ayni ekranda kalsin; karar verme hizi artarken akis bozulmasin."
        chips={[
          { label: signal.side, tone: signal.side === "LONG" ? "success" : "danger" },
          { label: formatSetupLabel(signal.setup), tone: "warning" },
          { label: `Skor ${signal.score.toFixed(1)}`, tone: "neutral" },
        ]}
        stats={[
          { label: "Entry", value: formatPrice(signal.entry), hint: "Planlanan tetik seviyesi" },
          { label: "Stop", value: formatPrice(signal.stop), hint: "Risk invalidation", tone: "danger" },
          { label: "TP1", value: formatPrice(signal.tp1), hint: "Ilk kar alma seviyesi", tone: "success" },
          { label: "TP2", value: formatPrice(signal.tp2), hint: "Ikinci hedef", tone: "success" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <Card className="p-6">
            <SectionTitle
              eyebrow="Execution Map"
              title="Seviye haritasi"
              description="Entry, stop ve hedefler ayni grafik yuzeyinde hizli okunabilsin."
            />
            <div className="mt-6 rounded-[28px] border border-white/8 bg-black/20 p-4">
              <LevelsChart
                entry={signal.entry}
                stop={signal.stop}
                tp1={signal.tp1}
                tp2={signal.tp2}
              />
            </div>
          </Card>

          <Card className="p-6">
            <SectionTitle
              eyebrow="Reasons"
              title="Bu sinyal neden secildi?"
              description="Teknik engine tarafindan uretilecek gerekceler net yuzeylerde gorelim."
            />

            <div className="mt-5 space-y-3">
              {signal.reasons.length > 0 ? (
                signal.reasons.map((reason) => (
                  <div
                    key={reason}
                    className="soft-panel rounded-[24px] px-4 py-3 text-sm leading-6 text-muted"
                  >
                    {reason}
                  </div>
                ))
              ) : (
                <div className="soft-panel rounded-[24px] px-4 py-3 text-sm leading-6 text-muted">
                  Bu sinyal icin detay gerekce listesi henuz yok.
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <MetricTile
                label="Funding"
                value={formatPercent((signal.marketMetrics.latestFundingRate ?? 0) * 100)}
                hint={signal.marketMetrics.squeezeBias}
              />
              <MetricTile
                label="OI Trend"
                value={formatPercent(signal.marketMetrics.openInterestTrendPct)}
                hint={`Guven ${Math.round(signal.confidence * 100)}%`}
                tone="accent"
              />
            </div>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="p-6">
            <SectionTitle
              eyebrow="Trade Decision"
              title="Bu islemi journale ekle"
              description="Sinyali neden sectigini yazarsan sonraki AI review daha faydali hale gelir."
            />
            <div className="mt-5 rounded-[28px] border border-white/8 bg-black/20 p-5">
              <SelectTradeButton signalId={signal.id} />
            </div>
          </Card>

          <Card className="p-6">
            <SectionTitle
              eyebrow="Technical Summary"
              title="Teknik snapshot"
              description="Trend, momentum ve volatilite bloklari tek yerde toparlansin."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricTile
                label="Trend"
                value={signal.trend}
                hint={`EMA200 1D: ${formatPrice(signal.technicalSnapshot.dailyEma200)}`}
              />
              <MetricTile
                label="Risk / Odul"
                value={signal.riskReward.toFixed(2)}
                hint={`Volume ratio ${signal.technicalSnapshot.volumeRatio.toFixed(2)}`}
                tone="accent"
              />
              <MetricTile
                label="RSI"
                value={signal.technicalSnapshot.rsi.toFixed(1)}
                hint="4H momentum filtresi"
              />
              <MetricTile
                label="BB Width"
                value={signal.technicalSnapshot.bbWidth.toFixed(2)}
                hint="Bollinger sikisma genisligi"
              />
              <MetricTile
                label="4H Close"
                value={formatPrice(signal.technicalSnapshot.fourHourClose)}
                hint={`4H EMA200: ${formatPrice(signal.technicalSnapshot.fourHourEma200)}`}
              />
              <MetricTile
                label="ATR"
                value={signal.technicalSnapshot.atr.toFixed(4)}
                hint={signal.summary}
              />
            </div>

            <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="flex flex-wrap gap-2">
                <Badge tone={signal.side === "LONG" ? "success" : "danger"}>{signal.side}</Badge>
                <Badge tone="neutral">{signal.coinName}</Badge>
                <Badge tone="warning">{signal.marketMetrics.squeezeBias}</Badge>
              </div>
              <p className="mt-4 text-sm leading-7 text-muted">{signal.summary}</p>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
