"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function SignalAIChat({ signalId, symbol }: { signalId: string; symbol: string }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function askQuestion() {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return;
    }

    const nextHistory = [...messages, { role: "user" as const, content: trimmedQuestion }];
    setMessages(nextHistory);
    setQuestion("");
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/ai/signal-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signalId,
          question: trimmedQuestion,
          history: messages,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; data?: { answer: string; bullets: string[] } }
        | null;

      if (!response.ok || !payload?.data) {
        setMessages(messages);
        setError(payload?.error ?? "AI yaniti alinmadi.");
        return;
      }

      const assistantText = [payload.data.answer, ...(payload.data.bullets ?? []).map((item) => `- ${item}`)]
        .filter(Boolean)
        .join("\n");

      setMessages([...nextHistory, { role: "assistant", content: assistantText }]);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm leading-6 text-muted">
          {symbol} sinyali icin Gemini'ye soru sor. Ornek: "En kritik invalidation nedir?" veya
          "Bu setup'ta erken cikis hangi durumda mantikli olur?"
        </p>
      </div>

      <div className="space-y-3">
        {messages.length > 0 ? (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={
                message.role === "user"
                  ? "rounded-[22px] border border-accent/20 bg-accent/10 px-4 py-3 text-sm leading-6 text-text"
                  : "rounded-[22px] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-muted whitespace-pre-line"
              }
            >
              {message.content}
            </div>
          ))
        ) : (
          <div className="rounded-[22px] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 text-muted">
            Henuz soru yok.
          </div>
        )}
      </div>

      <Textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Bu sinyalde entry beklemek mi, retest aramak mi daha mantikli?"
        className="min-h-24"
      />

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={isPending || !question.trim()}
          onClick={askQuestion}
          title="Bu sinyale ozel sorunu Gemini'ye gonderir ve Turkce cevap alirsin."
        >
          {isPending ? "Yanitlaniyor..." : "AI'ye sor"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-[18px] border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
