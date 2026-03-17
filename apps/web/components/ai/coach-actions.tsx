"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

type FeedbackState = {
  tone: "success" | "error";
  message: string;
} | null;

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

export function ReviewTradeButton({ tradeId }: { tradeId?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() => {
          setFeedback(null);
          startTransition(async () => {
            const response = await fetch("/api/ai/review-trade", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tradeId }),
            });

            if (!response.ok) {
              const errorMessage = await readErrorMessage(
                response,
                "Trade review su an olusturulamadi.",
              );
              setFeedback({ tone: "error", message: errorMessage });
              return;
            }

            setFeedback({
              tone: "success",
              message: "Trade review basariyla olusturuldu.",
            });
            router.refresh();
          });
        }}
      >
        {isPending ? "Analiz ediliyor..." : "Trade Review Calistir"}
      </Button>
      {feedback ? (
        <p className={feedback.tone === "success" ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

export function SuggestIndicatorsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [context, setContext] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  return (
    <div className="space-y-3">
      <textarea
        value={context}
        onChange={(event) => setContext(event.target.value)}
        placeholder="Istersen ek baglam yaz: ornegin breakout islemlerimde gec kaldigimi hissediyorum."
        className="min-h-24 w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text outline-none placeholder:text-muted"
      />
      <Button
        disabled={isPending}
        onClick={() => {
          setFeedback(null);
          startTransition(async () => {
            const response = await fetch("/api/ai/suggest-indicators", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ context }),
            });

            if (!response.ok) {
              const errorMessage = await readErrorMessage(
                response,
                "Indicator onerileri su an uretilemedi.",
              );
              setFeedback({ tone: "error", message: errorMessage });
              return;
            }

            const payload = (await response.json()) as { data?: Array<unknown> };
            const count = Array.isArray(payload.data) ? payload.data.length : 0;
            setFeedback({
              tone: "success",
              message:
                count > 0
                  ? `${count} adet indicator onerisi hazirlandi.`
                  : "Yeni benzersiz indicator onerisi cikmadi. Benzer bir oneriyi daha once kaydetmis olabilirsin.",
            });
            router.refresh();
          });
        }}
      >
        {isPending ? "Oneriler hazirlaniyor..." : "Yeni Indikator Oner"}
      </Button>
      {feedback ? (
        <p className={feedback.tone === "success" ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
