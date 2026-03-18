"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      setError("");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Giris basarisiz.");
        return;
      }

      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="glass-panel mx-auto w-full max-w-[460px] rounded-[32px] p-6 md:p-8">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.32em] text-accent">Secure Access</p>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-text">Panele giris yap</h1>
        <p className="text-sm leading-6 text-muted">
          Tek kullanicili trading paneline erismek icin kullanici adi ve sifreni gir.
        </p>
      </div>

      <div className="mt-6 space-y-4">
      <div className="space-y-2">
          <label className="text-sm font-medium text-text">Kullanici adi veya e-posta</label>
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="ornek: yakup.trader.admin veya mail@adresin.com"
            autoComplete="username"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-text">Sifre</label>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Sifreni gir"
            autoComplete="current-password"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submit();
              }
            }}
          />
        </div>

        <Button className="w-full" disabled={isPending || !username.trim() || !password} onClick={submit}>
          {isPending ? "Giris yapiliyor..." : "Giris yap"}
        </Button>

        {error ? (
          <p className="rounded-[18px] border border-danger/20 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
