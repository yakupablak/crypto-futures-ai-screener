import { ApproveProposalButton, ToggleIndicatorButton } from "@/components/indicators/indicator-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function IndicatorsPage() {
  const repository = getRepository();
  const [indicators, proposals] = await Promise.all([
    repository.getIndicators(),
    repository.getIndicatorProposals(),
  ]);
  const pendingProposals = proposals.filter((proposal) => proposal.status === "PENDING");

  return (
    <div className="space-y-6 pb-10">
      <Card className="p-6">
        <SectionTitle
          eyebrow="Indicator Lab"
          title="Built-in ve AI onerili filtreleri guvenli lifecycle ile yonet."
          description="Draft -> validated -> shadow -> live akisina tek panelden bak."
        />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <SectionTitle
            eyebrow="Indicator Catalog"
            title="Aktif filtre havuzu"
            description="Canli skoru etkileyen ve shadow modda izlenen indikatorler."
          />
          <div className="mt-5 space-y-4">
            {indicators.length > 0 ? (
              indicators.map((indicator) => (
                <div
                  key={indicator.id}
                  className="rounded-3xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-text">{indicator.name}</p>
                      <p className="text-sm text-muted">{indicator.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        tone={
                          indicator.status === "LIVE"
                            ? "success"
                            : indicator.status === "SHADOW"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {indicator.status}
                      </Badge>
                      <ToggleIndicatorButton indicatorId={indicator.id} />
                    </div>
                  </div>
                  <div className="mt-4 text-xs uppercase tracking-[0.18em] text-muted">
                    Score adjustment {indicator.scoreAdjustment >= 0 ? "+" : ""}
                    {indicator.scoreAdjustment}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">
                Henuz aktif ya da shadow indikator yok. AI onerilerini onayladiginda burada
                goreceksin.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle
            eyebrow="Proposals"
            title="Onay bekleyen AI onerileri"
            description="Istedigin oneriyi shadow mode olarak sisteme ekle."
          />
          <div className="mt-5 space-y-4">
            {pendingProposals.length > 0 ? (
              pendingProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="rounded-3xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-text">{proposal.proposal.name}</p>
                    <Badge tone="warning">{proposal.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{proposal.rationale}</p>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted">
                    Based on {proposal.basedOnTradeIds.length} realized trade
                  </p>
                  <div className="mt-4">
                    <ApproveProposalButton proposalId={proposal.id} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">
                Su anda onay bekleyen benzersiz bir AI onerisi yok. AI Coach ekranindan yeni
                oneriler calistirabilir veya onayladigin filtreleri soldaki catalogda gorebilirsin.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
