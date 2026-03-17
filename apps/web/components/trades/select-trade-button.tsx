"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

export function SelectTradeButton({ signalId }: { signalId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="İşlemi neden seçtiğine dair kısa not ekleyebilirsin."
        className="min-h-28 w-full rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-text outline-none placeholder:text-muted"
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
        {isPending ? "Kaydediliyor..." : "Bu işlemi seçiyorum"}
      </Button>
    </div>
  );
}
