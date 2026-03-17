"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CloseTradeForm({ tradeId }: { tradeId: string }) {
  const router = useRouter();
  const [closePrice, setClosePrice] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3 rounded-3xl border border-white/10 bg-black/20 p-4">
      <Input
        inputMode="decimal"
        placeholder="Kapanış fiyatı"
        value={closePrice}
        onChange={(event) => setClosePrice(event.target.value)}
      />
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Kapanış nedeni / not"
        className="min-h-24 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text outline-none placeholder:text-muted"
      />
      <Button
        variant="secondary"
        className="w-full"
        disabled={isPending || !closePrice}
        onClick={() => {
          startTransition(async () => {
            await fetch(`/api/trades/${tradeId}/close`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                closePrice: Number(closePrice),
                notes,
              }),
            });
            router.refresh();
          });
        }}
      >
        {isPending ? "Kapatılıyor..." : "Trade'i kapat"}
      </Button>
    </div>
  );
}
