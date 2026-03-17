import { ReviewTradeButton } from "@/components/ai/coach-actions";
import { CloseTradeForm } from "@/components/trades/close-trade-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/ui/section-title";
import { getRepository } from "@/lib/repository";
import { formatPercent, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const repository = getRepository();
  const trades = await repository.getTrades();

  return (
    <div className="space-y-6 pb-10">
      <Card className="p-6">
        <SectionTitle
          eyebrow="Trade Journal"
          title="Seçtiğin ve kapattığın işlemleri merkezi olarak izle."
          description="Manuel entry/exit akışıyla trade hafızası oluştur, sonra AI koç tarafından analiz ettir."
        />
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {trades.length > 0 ? (
          trades.map((trade) => (
            <Card key={trade.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-semibold text-text">{trade.symbol}</h3>
                    <Badge tone={trade.side === "LONG" ? "success" : "danger"}>{trade.side}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{trade.setup.replaceAll("_", " ")}</p>
                </div>
                <Badge tone={trade.status === "OPEN" ? "warning" : "neutral"}>
                  {trade.status}
                </Badge>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Entry" value={formatPrice(trade.entryPrice)} />
                <Metric label="Stop" value={formatPrice(trade.stopLoss)} />
                <Metric label="TP1" value={formatPrice(trade.tp1)} />
                <Metric label="TP2" value={formatPrice(trade.tp2)} />
                <Metric
                  label="PnL"
                  value={trade.realizedPnlPct == null ? "-" : formatPercent(trade.realizedPnlPct)}
                />
                <Metric
                  label="R-Multiple"
                  value={trade.realizedRMultiple == null ? "-" : trade.realizedRMultiple.toFixed(2)}
                />
              </div>

              <p className="mt-4 text-sm leading-6 text-muted">
                {trade.notes || "Bu trade için henüz açıklama notu girilmemiş."}
              </p>

              <div className="mt-5 flex flex-col gap-3">
                {trade.status === "OPEN" ? <CloseTradeForm tradeId={trade.id} /> : null}
                <ReviewTradeButton tradeId={trade.id} />
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-5">
            <p className="text-sm leading-6 text-muted">
              Henuz secilmis veya kapatilmis bir trade yok. Dashboard tarafindan bir sinyal secip
              journale dusurebilirsin.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-2 font-medium text-text">{value}</p>
    </div>
  );
}
