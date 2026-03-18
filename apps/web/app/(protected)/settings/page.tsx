import path from "node:path";

import { WhitelistManager } from "@/components/system/whitelist-manager";
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
        title="Ayarlar"
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
            hint: "AI yanitlari Turkce",
            tone: "accent",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-6">
          <SectionTitle eyebrow="Runtime" title="Calisma ortami" />

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
          <SectionTitle eyebrow="Trading Defaults" title="Tarama varsayimlari" />

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MetricTile
              label="Risk / Trade"
              value={`${settings.preferredRiskPerTradePct.toFixed(1)}%`}
              hint="Kisisel risk tercihi"
            />
            <MetricTile
              label="Max Signal"
              value={settings.maxSignals.toString()}
              hint="Dashboard ust limiti"
            />
            <MetricTile
              label="Scan Interval"
              value={`${settings.scanIntervalMinutes} dk`}
              hint="Worker dongu araligi"
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
          <SectionTitle eyebrow="Whitelist" title="Manuel izleme listesi" />

          <div className="mt-5">
            <WhitelistManager symbols={settings.whitelistSymbols} />
          </div>
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
