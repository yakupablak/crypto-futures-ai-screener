import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";

import { DashboardHero } from "@/components/dashboard/hero";
import { SignalCard } from "@/components/dashboard/signal-card";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { getRepository } from "@/lib/repository";
import { formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const repository = getRepository();
  const data = await repository.getDashboardData();

  return (
    <div className="space-y-6 pb-10">
      <DashboardHero data={data} />

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <SectionTitle
              eyebrow="Top 5 Signals"
              title="Bugün öne çıkan işlemler"
              description="Trend, setup, volume ve squeeze skorları birleştirilerek sıralandı."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {data.signals.length > 0 ? (
              data.signals.map((signal) => <SignalCard key={signal.id} signal={signal} />)
            ) : (
              <Card className="p-5">
                <p className="text-sm leading-6 text-muted">
                  Bu taramada kurallarina uyan aktif sinyal cikmadi. Manual sync
                  calistirabilir veya sonraki worker turunu bekleyebilirsin.
                </p>
              </Card>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle
              eyebrow="Market State"
              title="Son tarama notları"
              description="Scheduler tarafından üretilen çalışma özeti."
            />
            <div className="mt-5 space-y-3">
              {(data.latestScan?.notes ?? []).map((note) => (
                <div
                  key={note}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3"
                >
                  <ChevronRight className="mt-0.5 h-4 w-4 text-accent" />
                  <p className="text-sm text-muted">{note}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle
              eyebrow="Candidate Stack"
              title="Shortlist snapshot"
              description="Top 20 aday içinden ilk birkaç coin."
            />
            <div className="mt-5 space-y-3">
              {data.candidates.length > 0 ? (
                data.candidates.slice(0, 5).map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-text">{candidate.symbol}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">
                        {candidate.setup.replaceAll("_", " ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-text">{candidate.score.toFixed(1)}</p>
                      <p className="text-xs text-muted">
                        Funding {formatPercent(candidate.marketMetrics.latestFundingRate ? candidate.marketMetrics.latestFundingRate * 100 : 0)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">
                  Shortlist'e giren coin cikmadi. Trend ve setup filtreleri bugun oldukca siki
                  calisiyor.
                </p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle
              eyebrow="Quick Actions"
              title="Diğer modüller"
              description="Trade journal, AI coach ve indicator lab akışlarına geç."
            />
            <div className="mt-5 grid gap-3">
              {[
                { href: "/trades", label: "Trade Journal", text: "Açık ve kapanmış işlemleri yönet." },
                { href: "/ai", label: "AI Coach", text: "Trade review ve hata analizi çalıştır." },
                { href: "/indicators", label: "Indicator Lab", text: "Yeni filtreleri shadow/live yönet." },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-accent/40 hover:bg-white/[0.05]"
                >
                  <div>
                    <p className="font-medium text-text">{item.label}</p>
                    <p className="text-sm text-muted">{item.text}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-accent" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
