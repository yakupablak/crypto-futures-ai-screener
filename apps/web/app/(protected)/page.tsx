import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { DashboardHero } from "@/components/dashboard/hero";
import { SignalCard } from "@/components/dashboard/signal-card";
import { SyncActions } from "@/components/system/sync-actions";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { SectionTitle } from "@/components/ui/section-title";
import { getRepository } from "@/lib/repository";
import { formatPercent, formatRatio, formatRMultiple, formatSetupLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const repository = getRepository();
  const data = await repository.getDashboardData();

  return (
    <div className="page-section pb-10">
      <Card className="p-6">
        <SectionTitle eyebrow="Live Sync" title="Manuel senkronizasyon" />
        <div className="mt-5 rounded-[28px] border border-white/8 bg-black/20 p-5">
          <SyncActions />
        </div>
      </Card>

      <DashboardHero data={data} />

      <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
        <section className="space-y-5">
          <SectionTitle eyebrow="Signals" title="Top 5 signal" />

          <div className="grid gap-5">
            {data.signals.length === 0 ? (
              <Card className="p-8">
                <div className="space-y-3">
                  <p className="text-lg font-semibold text-text">Su an aktif signal yok</p>
                  <p className="max-w-2xl text-sm leading-7 text-muted">
                    Manuel scan tetikleyebilir veya whitelist ile kapsami genisletebilirsin.
                  </p>
                </div>
              </Card>
            ) : (
              data.signals.map((signal) => <SignalCard key={signal.id} signal={signal} />)
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <Card className="p-6">
            <SectionTitle eyebrow="Expectancy" title="Performans ozeti" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricTile
                label="Canli Expectancy"
                value={formatRMultiple(data.performance?.expectancyR ?? null)}
                hint={`${data.performance?.totalClosedTrades ?? 0} kapali trade`}
                tone={(data.performance?.expectancyR ?? 0) > 0 ? "success" : "warning"}
              />
              <MetricTile
                label="Profit Factor"
                value={formatRatio(data.performance?.profitFactor ?? null)}
                hint={`Ort. PnL ${formatPercent(data.performance?.averagePnlPct)}`}
                tone="accent"
              />
              <MetricTile
                label="WF Test"
                value={formatRMultiple(data.walkForward?.testExpectancyR ?? null)}
                hint={`${data.walkForward?.testSignals ?? 0} test signal`}
                tone={(data.walkForward?.testExpectancyR ?? 0) > 0 ? "success" : "warning"}
              />
              <MetricTile
                label="Signal Density"
                value={formatRatio(data.walkForward?.signalDensityPer100Bars ?? null)}
                hint={`WR ${formatPercent(data.walkForward?.testWinRate)}`}
              />
            </div>
            <div className="mt-5 space-y-3">
              {data.walkForward?.setupBreakdown?.length ? (
                data.walkForward.setupBreakdown.slice(0, 3).map((item) => (
                  <div key={item.setup} className="soft-panel rounded-[24px] px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-text">{formatSetupLabel(item.setup)}</p>
                        <p className="mt-1 text-sm text-muted">
                          {item.signals} signal / WR {formatPercent(item.winRate)}
                        </p>
                      </div>
                      <div className="text-right text-sm font-semibold text-text">
                        {formatRMultiple(item.expectancyR)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="soft-panel rounded-[24px] px-4 py-3 text-sm leading-6 text-muted">
                  Walk-forward ozeti henuz olusmadi.
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <SectionTitle eyebrow="Candidates" title="Shortlist" />
            <div className="mt-5 space-y-3">
              {data.candidates.slice(0, 5).length > 0 ? (
                data.candidates.slice(0, 5).map((candidate, index) => (
                  <div key={candidate.id} className="metric-panel rounded-[24px] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-text">{candidate.symbol}</p>
                        <p className="mt-1 text-sm text-muted">
                          {formatSetupLabel(candidate.setup)} / {candidate.side}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-muted">
                          #{index + 1}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-text">
                          {candidate.score.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MetricTile
                        label="Funding"
                        value={formatPercent((candidate.marketMetrics.latestFundingRate ?? 0) * 100)}
                        hint={candidate.marketMetrics.squeezeBias}
                      />
                      <MetricTile
                        label="OI Delta"
                        value={formatPercent(candidate.marketMetrics.openInterestTrendPct)}
                        hint={`RR ${candidate.riskReward.toFixed(2)}`}
                        tone="accent"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="soft-panel rounded-[24px] px-4 py-3 text-sm leading-6 text-muted">
                  Shortlist'te gorunen aday yok.
                </div>
              )}
            </div>
          </Card>

          {data.latestScan?.notes?.length ? (
            <Card className="p-6">
              <SectionTitle eyebrow="Scan" title="Son notlar" />
              <div className="mt-5 space-y-3">
                {data.latestScan.notes.slice(0, 4).map((note) => (
                  <div
                    key={note}
                    className="soft-panel rounded-[24px] px-4 py-3 text-sm leading-6 text-muted"
                  >
                    {note}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {data.signals[0] ? (
            <Link
              href={`/signals/${data.signals[0].id}`}
              className="group flex items-center justify-between rounded-[28px] border border-accent/30 bg-accent/10 px-5 py-4 text-sm text-text transition hover:-translate-y-0.5 hover:border-accent/50"
            >
              <span>
                Lider signal detayini ac: <strong>{data.signals[0].symbol}</strong>
              </span>
              <ChevronRight className="h-4 w-4 text-accent transition group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
