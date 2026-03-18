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

import { LogoutButton } from "@/components/auth/logout-button";
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
  username,
}: {
  children: React.ReactNode;
  username?: string | null;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/login")) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1680px] gap-5 px-4 py-5 md:px-6 lg:px-8">
      <aside className="hidden w-[288px] shrink-0 lg:block xl:w-[300px]">
        <div className="sticky top-5 space-y-4">
          <nav className="glass-panel rounded-[28px] p-3">
            <div className="px-2 pb-3 pt-1">
              <p className="text-[11px] uppercase tracking-[0.32em] text-muted">Menu</p>
            </div>
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active =
                  item.href === "/"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center justify-between rounded-[22px] border px-4 py-3 transition duration-200",
                      active
                        ? "border-accent/40 bg-accent/10 text-text"
                        : "border-white/5 bg-white/[0.02] text-muted hover:border-white/10 hover:bg-white/[0.04] hover:text-text",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-[18px] border transition",
                          active
                            ? "border-accent/40 bg-accent/15 text-accent"
                            : "border-white/5 bg-black/20 text-muted group-hover:border-white/10 group-hover:text-text",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="truncate font-medium">{item.label}</span>
                    </span>
                    <span
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full transition",
                        active ? "bg-accent" : "bg-white/10 group-hover:bg-white/20",
                      )}
                    />
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="glass-panel rounded-[28px] p-4">
            <p className="text-[11px] uppercase tracking-[0.32em] text-muted">Session</p>
            <p className="mt-3 text-sm font-medium text-text">{username ?? "Aktif kullanici"}</p>
            <p className="mt-1 text-sm leading-6 text-muted">Bu panel korumali oturumla acik.</p>
            <div className="mt-4">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-24 lg:pb-10">{children}</main>

      <nav className="glass-panel fixed inset-x-4 bottom-4 z-40 flex items-center justify-between rounded-[26px] px-3 py-2 lg:hidden">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2 text-[11px] font-medium transition",
                active ? "bg-accent/12 text-text" : "text-muted",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-muted")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
