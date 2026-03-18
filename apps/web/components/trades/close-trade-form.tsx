"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CloseTradeForm({ tradeId }: { tradeId: string }) {
  const router = useRouter();
  const [closePrice, setClosePrice] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4 rounded-[26px] border border-white/10 bg-black/20 p-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Trade Kapat</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Gercek kapanis fiyatini gir ve istersen cikis nedenini not et.
        </p>
      </div>
      <Input
        inputMode="decimal"
        placeholder="Kapanis fiyati"
        value={closePrice}
        onChange={(event) => setClosePrice(event.target.value)}
      />
      <Textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Kapanis nedeni veya trade notu"
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
        {isPending ? "Kapatiliyor..." : "Trade'i kapat"}
      </Button>
    </div>
  );
}
