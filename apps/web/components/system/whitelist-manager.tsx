"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WhitelistManager({ symbols }: { symbols: string[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const normalizedPreview = useMemo(() => {
    const cleaned = draft.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!cleaned) {
      return "";
    }
    return cleaned.endsWith("USDT") ? cleaned : `${cleaned}USDT`;
  }, [draft]);

  function updateWhitelist(symbol: string, action: "add" | "remove") {
    startTransition(async () => {
      setMessage("");

      const response = await fetch("/api/settings/whitelist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol, action }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setMessage(payload?.error ?? "Whitelist guncellenemedi.");
        return;
      }

      setMessage(
        action === "add"
          ? `${symbol.toUpperCase()} whitelist'e eklendi. Dashboard'dan sync calistirabilirsin.`
          : `${symbol.toUpperCase()} whitelist'ten kaldirildi.`,
      );
      if (action === "add") {
        setDraft("");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ornek: BTC veya BTCUSDT"
          />
          <p className="text-sm leading-6 text-muted">
            Coin sembolu gir. Sistem otomatik olarak USDT ciftine normalize eder.
            {normalizedPreview ? ` Kayit: ${normalizedPreview}` : ""}
          </p>
        </div>
        <Button
          disabled={isPending || !normalizedPreview}
          onClick={() => updateWhitelist(normalizedPreview, "add")}
          title="Yazdigin sembolu whitelist'e ekler. Sonra dashboard'dan sync ile universe'e dahil edebilirsin."
        >
          {isPending ? "Kaydediliyor..." : "Coin ekle"}
        </Button>
      </div>

      {symbols.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {symbols.map((symbol) => (
            <div
              key={symbol}
              className="inline-flex items-center gap-2 rounded-[18px] border border-white/10 bg-black/20 px-3 py-2 text-sm text-text"
            >
              <span className="font-medium">{symbol}</span>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-muted transition hover:border-danger/30 hover:text-danger"
                title={`${symbol} sembolunu whitelist'ten kaldir`}
                onClick={() => updateWhitelist(symbol, "remove")}
                disabled={isPending}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-muted">
          Henuz manuel eklenmis coin yok.
        </div>
      )}

      {message ? (
        <p className="rounded-[18px] border border-accent/20 bg-accent/10 px-3 py-2 text-sm text-accent">
          {message}
        </p>
      ) : null}
    </div>
  );
}
