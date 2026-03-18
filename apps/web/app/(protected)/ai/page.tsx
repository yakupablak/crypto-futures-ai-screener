import { ReviewTradeButton, SuggestIndicatorsButton } from "@/components/ai/coach-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/section-title";
import { getRepository } from "@/lib/repository";
import { formatIndicatorStatusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

function getReviewTypeLabel(type: string) {
  const map: Record<string, string> = {
    TRADE_REVIEW: "Trade Review",
    MISTAKE_MINING: "Hata Madenciligi",
    INDICATOR_PROPOSAL: "Indikator Onerisi",
    FILTER_TUNING: "Filtre Incelemesi",
  };

  return map[type] ?? type.replaceAll("_", " ");
}

export default async function AIPage() {
  const repository = getRepository();
  const [reviews, proposals, trades] = await Promise.all([
    repository.getAIReviews(),
    repository.getIndicatorProposals(),
    repository.getTrades(),
  ]);

  const lastReview = reviews[0];
  const pendingProposals = proposals.filter((proposal) => proposal.status === "PENDING");
  const averageConfidence =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.confidence, 0) / reviews.length
      : 0;
  const lastClosedTrade = trades.find((trade) => trade.status === "CLOSED");

  return (
    <div className="page-section pb-10">
      <PageHeader
        eyebrow="AI Coach"
        title="AI review ve oneriler"
        stats={[
          {
            label: "Son Review",
            value: lastReview ? getReviewTypeLabel(lastReview.type) : "Henuz yok",
            hint: lastReview?.summary ?? "Ilk review ile AI hafizasini baslat.",
            tone: "accent",
          },
          {
            label: "Bekleyen Oneri",
            value: pendingProposals.length.toString(),
            hint: "Indicator Lab ekraninda onay bekleyen oneriler",
          },
          {
            label: "Ortalama Guven",
            value: `${Math.round(averageConfidence * 100)}%`,
            hint: `${reviews.length} AI cikti kaydi uzerinden hesaplandi`,
            tone: averageConfidence >= 0.7 ? "success" : "warning",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6">
          <Card className="p-6">
            <SectionTitle eyebrow="Actions" title="Hizli aksiyonlar" />

            <div className="mt-5 grid gap-4">
              <div className="soft-panel rounded-[28px] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-text">Trade review olustur</p>
                    <p className="max-w-xl text-sm leading-6 text-muted">Son kapanan islemi AI ile yorumla.</p>
                  </div>
                  {lastClosedTrade ? <Badge tone="success">{lastClosedTrade.symbol}</Badge> : null}
                </div>
                <div className="mt-4">
                  <ReviewTradeButton tradeId={lastClosedTrade?.id} />
                </div>
              </div>

              <div className="soft-panel rounded-[28px] p-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-text">Yeni indikator onerisi iste</p>
                  <p className="max-w-xl text-sm leading-6 text-muted">
                    Kapanan islemlere gore yeni filtre fikri uret.
                  </p>
                </div>
                <div className="mt-4">
                  <SuggestIndicatorsButton />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionTitle eyebrow="Proposals" title="Bekleyen oneriler" />

            <div className="mt-5 space-y-3">
              {pendingProposals.length > 0 ? (
                pendingProposals.slice(0, 6).map((proposal) => (
                  <div key={proposal.id} className="metric-panel rounded-[26px] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-text">{proposal.proposal.name}</p>
                        <p className="mt-1 text-sm leading-6 text-muted">{proposal.summary}</p>
                      </div>
                      <Badge
                        tone={
                          proposal.status === "APPROVED"
                            ? "success"
                            : proposal.status === "REJECTED"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {formatIndicatorStatusLabel(proposal.status)}
                      </Badge>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MetricTile
                        label="Based On"
                        value={proposal.basedOnTradeIds.length.toString()}
                        hint="realize trade"
                      />
                      <MetricTile
                        label="Skor Etkisi"
                        value={proposal.proposal.scoreAdjustment.toFixed(2)}
                        hint={`v${proposal.proposal.version}`}
                        tone="accent"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="soft-panel rounded-[24px] px-4 py-3 text-sm leading-6 text-muted">
                  Bekleyen AI onerisi yok.
                </div>
              )}
            </div>
          </Card>
        </section>

        <aside>
          <Card className="p-6">
            <SectionTitle eyebrow="Recent Reviews" title="Son AI ciktilari" />

            <div className="mt-5 space-y-4">
              {reviews.length > 0 ? (
                reviews.slice(0, 6).map((review) => (
                  <div key={review.id} className="metric-panel rounded-[26px] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-text">
                          {getReviewTypeLabel(review.type)}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted">{review.summary}</p>
                      </div>
                      <Badge tone="neutral">{Math.round(review.confidence * 100)}% guven</Badge>
                    </div>

                    {review.mistakes.length > 0 ? (
                      <div className="mt-4">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-muted">
                          Tespit edilen noktalar
                        </p>
                        <div className="mt-2 space-y-2">
                          {review.mistakes.slice(0, 2).map((mistake) => (
                            <div
                              key={mistake}
                              className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-2 text-sm leading-6 text-muted"
                            >
                              {mistake}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {review.improvements.length > 0 ? (
                      <div className="mt-4">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-muted">
                          Onerilen gelisim
                        </p>
                        <div className="mt-2 space-y-2">
                          {review.improvements.slice(0, 2).map((improvement) => (
                            <div
                              key={improvement}
                              className="rounded-[18px] border border-emerald-400/15 bg-emerald-400/5 px-3 py-2 text-sm leading-6 text-emerald-100"
                            >
                              {improvement}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="soft-panel rounded-[24px] px-4 py-3 text-sm leading-6 text-muted">
                  Ilk AI review olustugunda burada listelenecek.
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
