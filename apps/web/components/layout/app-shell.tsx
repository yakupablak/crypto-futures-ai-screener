"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  CandlestickChart,
  FlaskConical,
  Settings2,
  Sparkles,
  Waypoints,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/", label: "Dashboard", icon: CandlestickChart },
  { href: "/trades", label: "Trade Journal", icon: Activity },
  { href: "/ai", label: "AI Coach", icon: Bot },
  { href: "/indicators", label: "Indicator Lab", icon: FlaskConical },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

const pageMeta = {
  "/": {
    title: "Piyasayi tara, sinyali sec, gunu tek panelden yonet",
    description:
      "Canli market tarama, trade hafizasi ve AI destekli gelisim akislarini ayni yerde toparla.",
  },
  "/trades": {
    title: "Acik ve kapanan islemleri temiz bir trade hafizasinda tut",
    description:
      "Her islemde entry, exit, not ve sonuc ayni akis icinde gorunsun; review sureci daha net ilerlesin.",
  },
  "/ai": {
    title: "AI Coach ile hatalari, iyilestirmeleri ve yeni filtreleri tek yerde gor",
    description:
      "Trade review, indicator onerileri ve karar kalitesi ayni baglam icinde anlam kazansin.",
  },
  "/indicators": {
    title: "Filtre katalogunu ve AI onerilerini daha guvenli bir laboratuvarda yonet",
    description:
      "Shadow ve live gecislerini karistirmadan, her indikatorun durumunu kolayca takip et.",
  },
  "/settings": {
    title: "Runtime ve tarama tercihlerine tek bakista hakim ol",
    description:
      "Lokal canli mod, Firebase durumu ve manuel sync akislarini daha rahat kontrol et.",
  },
} as const;

function resolvePageMeta(pathname: string) {
  if (pathname.startsWith("/signals/")) {
    return {
      title: "Sinyali karar ekraninda oku ve journale kontrollu sekilde gonder",
      description:
        "Entry, stop, hedefler ve teknik gerekceler ayni yuzeyde kalsin; karar vermek hizlansin.",
    };
  }

  return pageMeta[pathname as keyof typeof pageMeta] ?? pageMeta["/"];
}

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMockMode = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA !== "false";
  const meta = resolvePageMeta(pathname);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1720px] gap-5 px-4 py-5 md:px-6 lg:px-8">
      <aside className="hidden w-[296px] shrink-0 lg:block xl:w-[304px] 2xl:w-[316px]">
        <div className="sticky top-5 flex flex-col gap-4">
          <div className="glass-panel rounded-[30px] p-4">
            <p className="text-[11px] uppercase tracking-[0.32em] text-muted">Moduller</p>
            <nav className="mt-3 space-y-2">
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
                        "shrink-0",
                        "h-2.5 w-2.5 rounded-full transition",
                        active ? "bg-accent" : "bg-white/10 group-hover:bg-white/20",
                      )}
                    />
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="glass-panel rounded-[30px] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] uppercase tracking-[0.32em] text-muted">Sistem Durumu</p>
              <Badge tone={isMockMode ? "warning" : "success"}>
                {isMockMode ? "Mock" : "Live"}
              </Badge>
            </div>
            <div className="mt-3 space-y-3">
              <div className="metric-panel rounded-[22px] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text">
                      {isMockMode ? "Demo veri akisi" : "Canli Firebase deposu"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {isMockMode
                        ? "UI testleri icin demo veri acik."
                        : "Canli market ve depolama baglantisi etkin."}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full",
                      isMockMode ? "bg-warning" : "bg-success",
                    )}
                  />
                </div>
              </div>

              <div className="soft-panel rounded-[22px] p-4 text-sm leading-6 text-muted">
                <div className="flex items-center gap-2 text-text">
                  <Waypoints className="h-4 w-4 text-accent" />
                  <span className="font-medium">Akis ozeti</span>
                </div>
                <p className="mt-2">
                  Tarama, journal ve AI modulleri ayni runtime ustunde calisir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col gap-5 pb-24 lg:pb-10">
        <header className="glass-panel rounded-[32px] p-5 md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">Kisisel Trading Workspace</Badge>
                <Badge tone={isMockMode ? "warning" : "success"}>
                  {isMockMode ? "Mock runtime" : "Canli runtime"}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.34em] text-accent">Control Center</p>
                <h2 className="max-w-3xl text-2xl font-semibold leading-tight tracking-[-0.03em] text-text md:text-3xl">
                  {meta.title}
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-muted">{meta.description}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[420px]">
              <div className="metric-panel rounded-[24px] p-4">
                <div className="flex items-center gap-2 text-text">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold">Arayuz hedefi</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Daha az karmasa, daha hizli karar ve daha temiz aksiyon bloklari.
                </p>
              </div>
              <div className="metric-panel rounded-[24px] p-4">
                <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Aktif Sayfa</p>
                <p className="mt-3 text-lg font-semibold text-text">
                  {navigation.find((item) =>
                    item.href === "/"
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`),
                  )?.label ?? "Signal Detail"}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

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
