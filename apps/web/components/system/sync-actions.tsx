"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

type SyncMode = "FULL" | "SCAN" | "UNIVERSE";

export function SyncActions() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");

  function runSync(mode: SyncMode) {
    startTransition(async () => {
      setMessage("");

      const response = await fetch("/api/system/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode }),
      });

      if (!response.ok) {
        setMessage("Senkronizasyon basarisiz oldu.");
        return;
      }

      setMessage(
        mode === "FULL"
          ? "Canli full sync tamamlandi."
          : mode === "SCAN"
            ? "Canli market scan tamamlandi."
            : "Universe refresh tamamlandi.",
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending} onClick={() => runSync("FULL")}>
          {isPending ? "Calisiyor..." : "Full Sync"}
        </Button>
        <Button disabled={isPending} variant="secondary" onClick={() => runSync("SCAN")}>
          Sadece Scan
        </Button>
        <Button disabled={isPending} variant="ghost" onClick={() => runSync("UNIVERSE")}>
          Universe Refresh
        </Button>
      </div>
      <p className="text-sm text-muted">
        Lokal worker zaten periyodik calisir. Bu butonlar anlik manuel tetikleme icindir.
      </p>
      {message ? <p className="text-sm text-accent">{message}</p> : null}
    </div>
  );
}
