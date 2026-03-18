"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

type SyncMode = "FULL" | "SCAN" | "UNIVERSE";

const syncOptions: Array<{
  mode: SyncMode;
  label: string;
  variant: "primary" | "secondary" | "ghost";
  title: string;
}> = [
  {
    mode: "FULL",
    label: "Full sync",
    variant: "primary",
    title: "Universe, market scan, shadow, performans ve walk-forward verisini birlikte yeniler.",
  },
  {
    mode: "SCAN",
    label: "Sadece scan",
    variant: "secondary",
    title: "Mevcut universe uzerinde yeni market taramasi calistirir.",
  },
  {
    mode: "UNIVERSE",
    label: "Universe refresh",
    variant: "ghost",
    title: "Top 200 ve whitelist coin listesini yeniden olusturur.",
  },
];

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
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setMessage(payload?.error ?? "Senkronizasyon basarisiz oldu.");
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {syncOptions.map((option) => (
          <Button
            key={option.mode}
            disabled={isPending}
            variant={option.variant}
            onClick={() => runSync(option.mode)}
            title={option.title}
            aria-label={option.title}
          >
            {isPending && option.mode === "FULL" ? "Calisiyor..." : option.label}
          </Button>
        ))}
      </div>
      <p className="text-sm leading-6 text-muted">
        Butonlarin uzerine gelerek ne yaptiklarini gorebilirsin. Whitelist degisikliginden sonra en temiz yol once
        <strong className="text-text"> Universe refresh</strong>, sonra gerekirse <strong className="text-text">Full sync</strong> calistirmak.
      </p>
      {message ? (
        <p className="rounded-[18px] border border-accent/20 bg-accent/10 px-3 py-2 text-sm text-accent">
          {message}
        </p>
      ) : null}
    </div>
  );
}
