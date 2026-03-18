import type {
  PerformanceSetupStat,
  PerformanceSideStat,
  PerformanceSnapshot,
  SetupType,
  TradeJournalEntry,
  TradeSide,
} from "@crypto-futures/shared";

import { config } from "../lib/config";
import { listClosedTrades, savePerformanceSnapshot } from "../lib/persistence";

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function holdMinutes(trade: TradeJournalEntry) {
  if (!trade.closedAt) {
    return null;
  }

  return (new Date(trade.closedAt).getTime() - new Date(trade.openedAt).getTime()) / 60000;
}

function aggregateTradeSlice(trades: TradeJournalEntry[]) {
  const pnlValues = trades.map((trade) => trade.realizedPnlPct ?? 0);
  const rValues = trades.map((trade) => trade.realizedRMultiple ?? 0);
  const positivePnl = pnlValues.filter((value) => value > 0);
  const negativePnl = pnlValues.filter((value) => value < 0);
  const positiveR = rValues.filter((value) => value > 0);
  const negativeR = rValues.filter((value) => value < 0);
  const holdingTimes = trades
    .map((trade) => holdMinutes(trade))
    .filter((value): value is number => value != null && Number.isFinite(value));

  const grossProfit = positivePnl.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(negativePnl.reduce((sum, value) => sum + value, 0));
  const total = trades.length;
  const wins = positivePnl.length;

  return {
    total,
    wins,
    losses: total - wins,
    winRate: total === 0 ? 0 : Number(((wins / total) * 100).toFixed(2)),
    expectancyR: Number(average(rValues).toFixed(3)),
    averageR: Number(average(rValues).toFixed(3)),
    averagePnlPct: Number(average(pnlValues).toFixed(3)),
    averageWinPnlPct: Number(average(positivePnl).toFixed(3)),
    averageLossPnlPct: Number(average(negativePnl).toFixed(3)),
    averageWinR: Number(average(positiveR).toFixed(3)),
    averageLossR: Number(average(negativeR).toFixed(3)),
    profitFactor: grossLoss === 0 ? null : Number((grossProfit / grossLoss).toFixed(3)),
    averageHoldMinutes: Number(average(holdingTimes).toFixed(2)),
    medianHoldMinutes: Number(median(holdingTimes).toFixed(2)),
  };
}

function aggregateBySetup(trades: TradeJournalEntry[]) {
  const grouped = new Map<SetupType, TradeJournalEntry[]>();

  trades.forEach((trade) => {
    const key = trade.setup;
    const current = grouped.get(key) ?? [];
    current.push(trade);
    grouped.set(key, current);
  });

  return [...grouped.entries()].map(([setup, groupedTrades]): PerformanceSetupStat => ({
    setup,
    ...aggregateTradeSlice(groupedTrades),
  }));
}

function aggregateBySide(trades: TradeJournalEntry[]) {
  const grouped = new Map<TradeSide, TradeJournalEntry[]>();

  trades.forEach((trade) => {
    const current = grouped.get(trade.side) ?? [];
    current.push(trade);
    grouped.set(trade.side, current);
  });

  return [...grouped.entries()].map(([side, groupedTrades]): PerformanceSideStat => ({
    side,
    ...aggregateTradeSlice(groupedTrades),
  }));
}

export async function aggregatePerformanceJob() {
  const trades = await listClosedTrades(250);
  const overall = aggregateTradeSlice(trades);
  const setupStats = aggregateBySetup(trades);
  const sideStats = aggregateBySide(trades);

  const snapshot: PerformanceSnapshot = {
    ownerId: config.ownerId,
    updatedAt: new Date().toISOString(),
    totalClosedTrades: overall.total,
    overallWinRate: overall.winRate,
    expectancyR: overall.expectancyR,
    averageR: overall.averageR,
    averagePnlPct: overall.averagePnlPct,
    averageWinPnlPct: overall.averageWinPnlPct,
    averageLossPnlPct: overall.averageLossPnlPct,
    averageHoldMinutes: overall.averageHoldMinutes,
    medianHoldMinutes: overall.medianHoldMinutes,
    profitFactor: overall.profitFactor,
    setupStats,
    sideStats,
  };

  await savePerformanceSnapshot(snapshot);

  return {
    totalClosedTrades: overall.total,
    expectancyR: overall.expectancyR,
    profitFactor: overall.profitFactor,
  };
}
