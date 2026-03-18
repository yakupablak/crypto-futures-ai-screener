import { ApproveProposalButton, ToggleIndicatorButton } from "@/components/indicators/indicator-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/section-title";
import { getRepository } from "@/lib/repository";
import { formatIndicatorStatusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function IndicatorsPage() {
  const repository = getRepository();
  const [indicators, proposals] = await Promise.all([
    repository.getIndicators(),
    repository.getIndicatorProposals(),
  ]);

  const liveCount = indicators.filter((indicator) => indicator.status === "LIVE").length;
  const shadowCount = indicators.filter((indicator) => indicator.status === "SHADOW").length;
  const pendingProposals = proposals.filter((proposal) => proposal.status === "PENDING");

  return (
    <div className="page-section pb-10">
      <PageHeader
        eyebrow="Indicator Lab"
        title="Indikatorler"
        stats={[
          {
            label: "Toplam Filter",
            value: indicators.length.toString(),
            hint: "Tum katalog",
          },
          {
            label: "Live",
            value: liveCount.toString(),
            hint: "Skora aktif etki eden filtreler",
            tone: "success",
          },
          {
            label: "Shadow",
            value: shadowCount.toString(),
            hint: "Canli skoru etkilemeyen izleme modu",
            tone: "warning",
          },
          {
            label: "Bekleyen",
            value: pendingProposals.length.toString(),
            hint: "Onay bekleyen AI onerileri",
            tone: "accent",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
        <section>
          <Card className="p-6">
            <SectionTitle eyebrow="Catalog" title="Aktif katalog" />

            <div className="mt-5 space-y-4">
              {indicators.length > 0 ? (
                indicators.map((indicator) => (
                  <div key={indicator.id} className="metric-panel rounded-[28px] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            tone={
                              indicator.status === "LIVE"
                                ? "success"
                                : indicator.status === "SHADOW"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {formatIndicatorStatusLabel(indicator.status)}
                          </Badge>
                          {indicator.builtIn ? <Badge tone="neutral">Built-in</Badge> : null}
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-text">{indicator.name}</p>
                          <p className="mt-1 text-sm leading-6 text-muted">
                            {indicator.description}
                          </p>
                        </div>
                      </div>

                      <div className="xl:w-[220px]">
                        <ToggleIndicatorButton indicatorId={indicator.id} />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MetricTile
                        label="Skor Etkisi"
                        value={indicator.scoreAdjustment.toFixed(2)}
                        hint={`DSL seri sayisi: ${indicator.dsl.series.length}`}
                        tone="accent"
                      />
                      <MetricTile
                        label="Versiyon"
                        value={`v${indicator.version}`}
                        hint={
                          indicator.approvedAt
                            ? `Onay: ${new Date(indicator.approvedAt).toLocaleDateString("tr-TR")}`
                            : "Henuz onay zamani yok"
                        }
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="soft-panel rounded-[24px] px-4 py-3 text-sm leading-6 text-muted">
                  Indicator katalogu henuz dolmadi.
                </div>
              )}
            </div>
          </Card>
        </section>

        <aside>
          <Card className="p-6">
            <SectionTitle eyebrow="Pending Queue" title="Bekleyen oneriler" />

            <div className="mt-5 space-y-4">
              {pendingProposals.length > 0 ? (
                pendingProposals.map((proposal) => (
                  <div key={proposal.id} className="soft-panel rounded-[28px] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-text">{proposal.proposal.name}</p>
                        <p className="mt-1 text-sm leading-6 text-muted">{proposal.summary}</p>
                      </div>
                      <Badge tone="warning">{formatIndicatorStatusLabel(proposal.status)}</Badge>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MetricTile
                        label="Skor Etkisi"
                        value={proposal.proposal.scoreAdjustment.toFixed(2)}
                        hint={`v${proposal.proposal.version}`}
                        tone="accent"
                      />
                      <MetricTile
                        label="Trade Dayanagi"
                        value={proposal.basedOnTradeIds.length.toString()}
                        hint="Kullanilan trade sayisi"
                      />
                    </div>

                    <div className="mt-4 rounded-[22px] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-muted">
                      {proposal.rationale}
                    </div>

                    <div className="mt-4">
                      <ApproveProposalButton proposalId={proposal.id} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="soft-panel rounded-[24px] px-4 py-3 text-sm leading-6 text-muted">
                  Bekleyen benzersiz AI onerisi yok.
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
