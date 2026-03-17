import { ReviewTradeButton, SuggestIndicatorsButton } from "@/components/ai/coach-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function AIPage() {
  const repository = getRepository();
  const [reviews, proposals] = await Promise.all([
    repository.getAIReviews(),
    repository.getIndicatorProposals(),
  ]);

  return (
    <div className="space-y-6 pb-10">
      <Card className="p-6">
        <SectionTitle
          eyebrow="AI Coach"
          title="Trade review, mistake mining ve indicator önerilerini tek akışta yönet."
          description="Mock modda deterministik fallback çalışır; Firebase Functions bağlandığında Gemini structured output akışı devreye girer."
        />
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5">
          <SectionTitle
            eyebrow="Actions"
            title="Yeni AI çalıştır"
            description="Tek bir trade review çalıştırabilir veya realize işlemlerden yeni filtre isteyebilirsin."
          />
          <div className="mt-5 flex flex-col gap-4">
            <ReviewTradeButton />
            <SuggestIndicatorsButton />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle
            eyebrow="Recent Reviews"
            title="Son yorumlar"
            description="Trade notlarından türetilen güçlü / zayıf yönler."
          />
          <div className="mt-5 space-y-4">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-3xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center gap-3">
                    <Badge tone="neutral">{review.type.replaceAll("_", " ")}</Badge>
                    <span className="text-xs text-muted">
                      Confidence {Math.round(review.confidence * 100)}%
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text">{review.summary}</p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">Hatalar</p>
                      <ul className="mt-2 space-y-2 text-sm text-muted">
                        {review.mistakes.map((mistake) => (
                          <li key={mistake}>{mistake}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">İyileştirme</p>
                      <ul className="mt-2 space-y-2 text-sm text-muted">
                        {review.improvements.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">
                Henuz AI review uretilmedi. Trade review veya yeni indikatör onerisi
                calistirabilirsin.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle
          eyebrow="Indicator Proposals"
          title="AI tarafından önerilen yeni filtreler"
          description="Beğendiğin önerileri Indicator Lab ekranından shadow mode olarak ekleyebilirsin."
        />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {proposals.length > 0 ? (
            proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="rounded-3xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-text">{proposal.proposal.name}</p>
                  <Badge tone={proposal.status === "PENDING" ? "warning" : "success"}>
                    {proposal.status}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{proposal.summary}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">
              Henuz indicator proposal yok. Realize trade biriktikce bu alan daha anlamli hale
              gelecek.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
