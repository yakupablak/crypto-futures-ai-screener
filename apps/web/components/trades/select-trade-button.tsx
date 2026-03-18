"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function SelectTradeButton({ signalId }: { signalId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Trade Notu</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          Bu sinyali neden sectigini yazman, daha sonra AI review kalitesini belirgin bicimde
          artirir.
        </p>
      </div>
      <Textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Ornek: 4H retest temizdi, stop kisaydi ve funding lehimeydi."
      />
      <Button
        className="w-full"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await fetch("/api/trades", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ signalId, notes }),
            });
            router.push("/trades");
            router.refresh();
          });
        }}
      >
        {isPending ? "Kaydediliyor..." : "Bu islemi seciyorum"}
      </Button>
    </div>
  );
}
