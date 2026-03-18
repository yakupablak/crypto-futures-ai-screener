import path from "node:path";

import { SyncActions } from "@/components/system/sync-actions";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/section-title";
import {
  env,
  getFirebaseServiceAccountPath,
  hasFirebaseAdminConfig,
} from "@/lib/env";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const repository = getRepository();
  const settings = await repository.getSettings();
  const serviceAccountPath = getFirebaseServiceAccountPath();

  return (
    <div className="page-section pb-10">
      <PageHeader
        eyebrow="Settings"
        title="Runtime, tarama davranisi ve lokal canli akis ayarlarini tek yerde topla."
        description="Lokal calismada bile sistemin neyle, hangi modda ve hangi varsayimlarla ayakta oldugunu net gormek karar kalitesini artirir."
        stats={[
          {
            label: "Mock Data",
            value: env.enableMockData ? "Acik" : "Kapali",
            hint: env.enableMockData ? "Demo veri modu etkin" : "Gercek veri modu etkin",
            tone: env.enableMockData ? "warning" : "success",
          },
          {
            label: "Firebase Admin",
            value: hasFirebaseAdminConfig() ? "Hazir" : "Eksik",
            hint: serviceAccountPath ? path.basename(serviceAccountPath) : "Credential bulunamadi",
            tone: hasFirebaseAdminConfig() ? "success" : "danger",
          },
          {
            label: "Gemini Model",
            value: env.geminiModel,
            hint: `Fast model: ${env.geminiFastModel}`,
          },
          {
            label: "Dil",
            value: settings.language.toUpperCase(),
            hint: "AI yanitlari Turkce zorlamali",
            tone: "accent",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <SectionTitle
            eyebrow="Runtime"
            title="Calisma ortami"
            description="Aktif owner, proje ve credential bilgilerini tek bakista oku."
          />

          <div className="mt-5 space-y-3">
            <SettingRow label="Owner UID" value={env.appOwnerId} />
            <SettingRow label="Firebase Project" value={env.firebaseProjectId ?? "Belirsiz"} />
            <SettingRow
              label="Service Account"
              value={serviceAccountPath ? path.basename(serviceAccountPath) : "Bulunamadi"}
            />
            <SettingRow
              label="Repository Mode"
              value={env.enableMockData ? "Mock repository" : "Firestore repository"}
            />
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle
            eyebrow="Trading Defaults"
            title="Tarama ve risk varsayimlari"
            description="Sinyal motorunun hangi varsayimlarla calistigini daha okunur metriklerle gor."
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricTile
              label="Risk / Trade"
              value={`${settings.preferredRiskPerTradePct.toFixed(1)}%`}
              hint="Kisisel risk tercihi"
            />
            <MetricTile
              label="Max Signal"
              value={settings.maxSignals.toString()}
              hint="Dashboard'da listelenecek ust limit"
            />
            <MetricTile
              label="Scan Interval"
              value={`${settings.scanIntervalMinutes} dk`}
              hint="Lokal worker dongu araligi"
            />
            <MetricTile
              label="Aktif Indicator"
              value={settings.activeIndicatorIds.length.toString()}
              hint="Canli skora etki eden filtre sayisi"
              tone="accent"
            />
          </div>
        </Card>

        <Card className="p-6 xl:col-span-2">
          <SectionTitle
            eyebrow="Live Sync"
            title="Manuel senkronizasyon"
            description="Universe veya market scan akisini ihtiyac oldugunda elle tetikle."
          />

          <div className="mt-5 rounded-[28px] border border-white/8 bg-black/20 p-5">
            <SyncActions />
          </div>
        </Card>

        <Card className="p-6 xl:col-span-2">
          <SectionTitle
            eyebrow="Whitelist"
            title="Manuel izleme listesi"
            description="Top 200 disindaki ama bilerek takip etmek istedigin semboller burada listelenir."
          />

          {settings.whitelistSymbols.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {settings.whitelistSymbols.map((symbol) => (
                <MetricTile key={symbol} label="Whitelist" value={symbol} hint="Manuel eklenen sembol" />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-muted">
              Whitelist listesi bos. Simdilik yalnizca market cap tabanli universe ile
              tarama yapiyoruz.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="soft-panel flex items-center justify-between gap-4 rounded-[22px] px-4 py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-semibold text-text">{value}</span>
    </div>
  );
}
