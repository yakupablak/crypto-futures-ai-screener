import path from "node:path";

import { SyncActions } from "@/components/system/sync-actions";
import { Card } from "@/components/ui/card";
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
    <div className="space-y-6 pb-10">
      <Card className="p-6">
        <SectionTitle
          eyebrow="Settings"
          title="Calisma modu, whitelist ve lokal canli runtime"
          description="Bu panelden local live mod durumunu gor ve manuel sync tetikle."
        />
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <SectionTitle
            eyebrow="Runtime"
            title="Bağlantı durumu"
            description="Şu an hangi modda çalıştığını gör."
          />
          <div className="mt-5 space-y-3 text-sm">
            <Row label="Mock Data" value={env.enableMockData ? "Enabled" : "Disabled"} />
            <Row
              label="Firebase Admin"
              value={hasFirebaseAdminConfig() ? "Configured" : "Missing credentials"}
            />
            <Row
              label="Credential Source"
              value={serviceAccountPath ? path.basename(serviceAccountPath) : "Env only / missing"}
            />
            <Row label="Owner UID" value={settings.ownerId} />
            <Row label="Gemini Model" value={env.geminiModel} />
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle
            eyebrow="Trading Defaults"
            title="Screener tercihleri"
            description="Kişisel kullanım varsayımları."
          />
          <div className="mt-5 space-y-3 text-sm">
            <Row label="Risk / Trade" value={`${settings.preferredRiskPerTradePct}%`} />
            <Row label="Maksimum Sinyal" value={settings.maxSignals.toString()} />
            <Row label="Tarama Aralığı" value={`${settings.scanIntervalMinutes} dk`} />
            <Row label="Dil" value={settings.language.toUpperCase()} />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle
          eyebrow="Live Sync"
          title="Canli veri akisini manuel tetikle"
          description="Lokal worker acik olsa da istedigin anda one-shot sync calistirabilirsin."
        />
        <div className="mt-5">
          <SyncActions />
        </div>
      </Card>

      <Card className="p-5">
        <SectionTitle
          eyebrow="Whitelist"
          title="Manuel eklenen coinler"
          description="Whitelist ayarlari settings belgesinde tutulur."
        />
        <div className="mt-5 flex flex-wrap gap-3">
          {settings.whitelistSymbols.map((symbol) => (
            <span
              key={symbol}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-text"
            >
              {symbol}
            </span>
          ))}
          {settings.whitelistSymbols.length === 0 ? (
            <p className="text-sm text-muted">Henuz manuel whitelist coin eklenmedi.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}
