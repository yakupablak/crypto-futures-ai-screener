import type { TradeJournalEntry } from "@crypto-futures/shared";

import { getDb } from "../lib/admin";
import { config } from "../lib/config";
import { listClosedTrades } from "../lib/persistence";

function aggregateBySetup(trades: TradeJournalEntry[]) {
  const grouped = new Map<
    string,
    { total: number; wins: number; totalR: number; totalPnl: number }
  >();

  trades.forEach((trade) => {
    const key = trade.setup;
    const current = grouped.get(key) ?? { total: 0, wins: 0, totalR: 0, totalPnl: 0 };
    current.total += 1;
    current.wins += (trade.realizedPnlPct ?? 0) > 0 ? 1 : 0;
    current.totalR += trade.realizedRMultiple ?? 0;
    current.totalPnl += trade.realizedPnlPct ?? 0;
    grouped.set(key, current);
  });

  return [...grouped.entries()].map(([setup, value]) => ({
    setup,
    total: value.total,
    winRate: value.total === 0 ? 0 : Number(((value.wins / value.total) * 100).toFixed(2)),
    averageR: value.total === 0 ? 0 : Number((value.totalR / value.total).toFixed(2)),
    averagePnlPct:
      value.total === 0 ? 0 : Number((value.totalPnl / value.total).toFixed(2)),
  }));
}

export async function aggregatePerformanceJob() {
  const db = getDb();
  const trades = await listClosedTrades(100);
  const setupStats = aggregateBySetup(trades);
  const total = trades.length;
  const wins = trades.filter((trade) => (trade.realizedPnlPct ?? 0) > 0).length;

  await db.collection("marketState").doc("performance").set({
    ownerId: config.ownerId,
    updatedAt: new Date().toISOString(),
    totalClosedTrades: total,
    overallWinRate: total === 0 ? 0 : Number(((wins / total) * 100).toFixed(2)),
    setupStats,
  });

  return { totalClosedTrades: total };
}
