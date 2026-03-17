"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  CandlestickChart,
  FlaskConical,
  Settings2,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Dashboard", icon: CandlestickChart },
  { href: "/trades", label: "Trade Journal", icon: Activity },
  { href: "/ai", label: "AI Coach", icon: Bot },
  { href: "/indicators", label: "Indicator Lab", icon: FlaskConical },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMockMode = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA !== "false";

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-5 md:px-6 lg:px-8">
      <aside className="glass-panel hidden w-[280px] shrink-0 rounded-[28px] border border-white/10 p-5 lg:flex lg:flex-col lg:justify-between">
        <div className="space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-3 rounded-full bg-white/5 px-3 py-2">
              <span className="h-3 w-3 rounded-full bg-accent" />
              <span className="text-xs uppercase tracking-[0.3em] text-muted">
                Crypto Futures OS
              </span>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-text">
                Futures tarama, journaling ve AI koc tek panelde.
              </h1>
              <p className="text-sm leading-6 text-muted">
                Top 200 + whitelist coin evreni, deterministik rule engine ve dinamik indikator laboratuvari.
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3 transition",
                    active
                      ? "border-accent/50 bg-accent/10 text-text"
                      : "border-white/5 bg-white/[0.02] text-muted hover:border-white/10 hover:bg-white/[0.04] hover:text-text",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                  </span>
                  {active ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Runtime</p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text">
                {isMockMode ? "Mock + Ready" : "Firestore Live"}
              </p>
              <p className="text-xs text-muted">
                {isMockMode
                  ? "Firebase bilgileri gelmeden demo veriyle calisiyor."
                  : "Canli veri deposu etkin."}
              </p>
            </div>
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                isMockMode ? "bg-warning" : "bg-success",
              )}
            />
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col gap-6">
        <div className="glass-panel flex items-center justify-between rounded-[28px] px-5 py-4 lg:hidden">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent">Crypto Futures OS</p>
            <p className="text-sm text-muted">Kisisel screener ve trade hafizasi</p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              isMockMode
                ? "bg-warning/15 text-warning"
                : "bg-success/15 text-success",
            )}
          >
            {isMockMode ? "Mock" : "Live"}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
