import type { TradeJournalEntry } from "@crypto-futures/shared";

import { ReviewTradeButton } from "@/components/ai/coach-actions";
import { CloseTradeForm } from "@/components/trades/close-trade-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MetricTile } from "@/components/ui/metric-tile";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/section-title";
import { getRepository } from "@/lib/repository";
import {
  formatPercent,
  formatPrice,
  formatSetupLabel,
  formatTradeStatusLabel,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const repository = getRepository();
  const trades = await repository.getTrades();

  const openTrades = trades.filter((trade) => trade.status === "OPEN");
  const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
  const averageR =
    closedTrades.length > 0
      ? closedTrades.reduce((sum, trade) => sum + (trade.realizedRMultiple ?? 0), 0) /
        closedTrades.length
      : 0;
  const averagePnl =
    closedTrades.length > 0
      ? closedTrades.reduce((sum, trade) => sum + (trade.realizedPnlPct ?? 0), 0) /
        closedTrades.length
      : 0;

  return (
    <div className="page-section pb-10">
      <PageHeader
        eyebrow="Trade Journal"
        title="Acik ve kapanan islemleri tek bir karar hafizasinda topla."
        description="Entry, stop, hedef, not ve AI review akisi ayni yuzeyde kalsin; geriye donup neyi dogru neyi zayif yaptigini daha hizli okuyabilelim."
        stats={[
          {
            label: "Acik Trade",
            value: openTrades.length.toString(),
            hint: "Yonetim bekleyen aktif islemler",
            tone: "warning",
          },
          {
            label: "Kapali Trade",
            value: closedTrades.length.toString(),
            hint: "Hafizada kalan realize sonuc",
          },
          {
            label: "Ortalama R",
            value: averageR.toFixed(2),
            hint: "Kapali trade'ler uzerinden",
            tone: averageR >= 0 ? "success" : "danger",
          },
          {
            label: "Ortalama PnL",
            value: formatPercent(averagePnl),
            hint: "Yuzdesel gerceklesen sonuc",
            tone: averagePnl >= 0 ? "success" : "danger",
          },
        ]}
      />

      <section className="space-y-5">
        <SectionTitle
          eyebrow="Open Trades"
          title="Aktif pozisyonlar"
          description="Kapatma aksiyonu, notlar ve mevcut setup ayni kart icinde yer alsin."
        />
        <div className="grid gap-5">
          {openTrades.length > 0 ? (
            openTrades.map((trade) => <TradeCard key={trade.id} trade={trade} />)
          ) : (
            <Card className="p-8">
              <p className="text-lg font-semibold text-text">Acik trade yok</p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
                Signal detay ekranindan bir trade sectiginde burada yonetmeye hazir gorunecek.
              </p>
            </Card>
          )}
        </div>
      </section>

      <section className="space-y-5">
        <SectionTitle
          eyebrow="Closed Trades"
          title="Kapanmis islemler"
          description="Sonuc, AI review ve dersler ayni yerde toplanarak gelisim dongusu netlessin."
        />
        <div className="grid gap-5">
          {closedTrades.length > 0 ? (
            closedTrades.map((trade) => <TradeCard key={trade.id} trade={trade} />)
          ) : (
            <Card className="p-8">
              <p className="text-lg font-semibold text-text">Kapanmis trade yok</p>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
                Ilk trade kapanisindan sonra performans metrikleri ve review butonu daha anlamli
                hale gelecek.
              </p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

function TradeCard({ trade }: { trade: TradeJournalEntry }) {
  const isOpen = trade.status === "OPEN";
  const pnl = trade.realizedPnlPct ?? 0;

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={trade.side === "LONG" ? "success" : "danger"}>{trade.side}</Badge>
                <Badge tone={isOpen ? "warning" : pnl >= 0 ? "success" : "danger"}>
                  {formatTradeStatusLabel(trade.status)}
                </Badge>
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-text">{trade.symbol}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {formatSetupLabel(trade.setup)} • {trade.leverage}x kaldirac
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[320px]">
              <MetricTile
                label="Acilis"
                value={formatPrice(trade.entryPrice)}
                hint={new Date(trade.openedAt).toLocaleString("tr-TR")}
              />
              <MetricTile
                label="Kapanis"
                value={trade.closePrice ? formatPrice(trade.closePrice) : "-"}
                hint={trade.closedAt ? new Date(trade.closedAt).toLocaleString("tr-TR") : "Acik"}
                tone={isOpen ? "warning" : pnl >= 0 ? "success" : "danger"}
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile label="Stop" value={formatPrice(trade.stopLoss)} tone="danger" />
            <MetricTile label="TP1" value={formatPrice(trade.tp1)} tone="success" />
            <MetricTile label="TP2" value={formatPrice(trade.tp2)} tone="success" />
            <MetricTile
              label="PnL"
              value={trade.realizedPnlPct != null ? formatPercent(trade.realizedPnlPct) : "-"}
              hint={
                trade.realizedRMultiple != null ? `R: ${trade.realizedRMultiple.toFixed(2)}` : ""
              }
              tone={
                trade.realizedPnlPct == null
                  ? "neutral"
                  : trade.realizedPnlPct >= 0
                    ? "success"
                    : "danger"
              }
            />
          </div>

          <div className="soft-panel rounded-[26px] p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted">Trade Notu</p>
            <p className="mt-3 text-sm leading-7 text-muted">
              {trade.notes.trim() ? trade.notes : "Bu trade icin not eklenmemis."}
            </p>
          </div>
        </div>

        <div className="w-full xl:max-w-[360px]">
          {isOpen ? (
            <CloseTradeForm tradeId={trade.id} />
          ) : (
            <div className="space-y-4 rounded-[26px] border border-white/10 bg-black/20 p-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted">AI Review</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Bu trade'in sonucunu AI ile degerlendirip hatalari ve gelisim noktalarini Turkce
                  inceleyebilirsin.
                </p>
              </div>
              <ReviewTradeButton tradeId={trade.id} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
