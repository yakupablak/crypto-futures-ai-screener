import {
  mockAIReviews,
  mockIndicatorProposals,
  mockIndicators,
  mockPerformanceSnapshot,
  mockScanRuns,
  mockSettings,
  mockSignalCandidates,
  mockSignals,
  mockTrades,
  mockWalkForwardSummary,
  tradeClosePayloadSchema,
  type CreateTradePayload,
  type IndicatorDefinition,
  type IndicatorProposal,
  type PerformanceSnapshot,
  type ScanRun,
  type SignalCandidate,
  type SignalSnapshot,
  type TradeClosePayload,
  type TradeJournalEntry,
  type TradeReviewReport,
  type UserSettings,
  type WalkForwardSummary,
} from "@crypto-futures/shared";

import type { DashboardData, DataRepository } from "./types";

interface MockDatabase {
  signals: SignalSnapshot[];
  candidates: SignalCandidate[];
  trades: TradeJournalEntry[];
  indicators: IndicatorDefinition[];
  proposals: IndicatorProposal[];
  reviews: TradeReviewReport[];
  scanRuns: ScanRun[];
  settings: UserSettings;
  performance: PerformanceSnapshot | null;
  walkForward: WalkForwardSummary | null;
}

declare global {
  var __cryptoFuturesMockDb: MockDatabase | undefined;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getStore(): MockDatabase {
  if (!globalThis.__cryptoFuturesMockDb) {
    globalThis.__cryptoFuturesMockDb = {
      signals: clone(mockSignals),
      candidates: clone(mockSignalCandidates),
      trades: clone(mockTrades),
      indicators: clone(mockIndicators),
      proposals: clone(mockIndicatorProposals),
      reviews: clone(mockAIReviews),
      scanRuns: clone(mockScanRuns),
      settings: clone(mockSettings),
      performance: clone(mockPerformanceSnapshot),
      walkForward: clone(mockWalkForwardSummary),
    };
  }

  return globalThis.__cryptoFuturesMockDb;
}

function toTradePnl(trade: TradeJournalEntry, closePrice: number) {
  const risk = Math.abs(trade.entryPrice - trade.stopLoss);
  const reward =
    trade.side === "LONG"
      ? closePrice - trade.entryPrice
      : trade.entryPrice - closePrice;

  return {
    realizedRMultiple: risk === 0 ? 0 : reward / risk,
    realizedPnlPct:
      trade.entryPrice === 0 ? 0 : (reward / trade.entryPrice) * 100 * trade.leverage,
  };
}

export class MockRepository implements DataRepository {
  async getDashboardData(): Promise<DashboardData> {
    const store = getStore();
    return {
      latestScan: store.scanRuns[0] ?? null,
      signals: clone(store.signals),
      candidates: clone(store.candidates),
      trades: clone(store.trades),
      aiReviews: clone(store.reviews),
      indicators: clone(store.indicators),
      proposals: clone(store.proposals),
      settings: clone(store.settings),
      performance: clone(store.performance),
      walkForward: clone(store.walkForward),
    };
  }

  async getSignals() {
    return clone(getStore().signals);
  }

  async getSignalCandidates() {
    return clone(getStore().candidates);
  }

  async getSignalById(id: string) {
    return clone(getStore().signals.find((signal) => signal.id === id) ?? null);
  }

  async getTrades() {
    return clone(getStore().trades);
  }

  async getSettings() {
    return clone(getStore().settings);
  }

  async getIndicators() {
    return clone(getStore().indicators);
  }

  async getIndicatorProposals() {
    return clone(getStore().proposals);
  }

  async getAIReviews() {
    return clone(getStore().reviews);
  }

  async getScanRuns() {
    return clone(getStore().scanRuns);
  }

  async createTrade(payload: CreateTradePayload) {
    const store = getStore();
    const signal = store.signals.find((item) => item.id === payload.signalId);
    if (!signal) {
      throw new Error("Signal bulunamadı.");
    }

    const trade: TradeJournalEntry = {
      id: `trade-${Date.now()}`,
      ownerId: signal.ownerId,
      signalId: signal.id,
      symbol: signal.symbol,
      setup: signal.setup,
      side: signal.side,
      leverage: 2,
      entryPrice: signal.entry,
      stopLoss: signal.stop,
      tp1: signal.tp1,
      tp2: signal.tp2,
      status: "OPEN",
      openedAt: new Date().toISOString(),
      closedAt: null,
      closePrice: null,
      realizedRMultiple: null,
      realizedPnlPct: null,
      notes: payload.notes ?? "",
    };

    store.trades.unshift(trade);
    return clone(trade);
  }

  async closeTrade(id: string, payload: TradeClosePayload) {
    tradeClosePayloadSchema.parse(payload);
    const store = getStore();
    const trade = store.trades.find((item) => item.id === id);
    if (!trade) {
      throw new Error("Trade bulunamadı.");
    }

    const result = toTradePnl(trade, payload.closePrice);
    trade.status = "CLOSED";
    trade.closedAt = new Date().toISOString();
    trade.closePrice = payload.closePrice;
    trade.realizedRMultiple = Number(result.realizedRMultiple.toFixed(2));
    trade.realizedPnlPct = Number(result.realizedPnlPct.toFixed(2));
    trade.notes = payload.notes ?? trade.notes;

    return clone(trade);
  }

  async approveIndicatorProposal(id: string) {
    const store = getStore();
    const proposal = store.proposals.find((item) => item.id === id);
    if (!proposal) {
      throw new Error("Indicator proposal bulunamadı.");
    }

    proposal.status = "APPROVED";
    const indicator = {
      ...proposal.proposal,
      status: "SHADOW" as const,
      approvedAt: new Date().toISOString(),
    };
    store.indicators.unshift(indicator);
    return clone(indicator);
  }

  async toggleIndicator(id: string) {
    const store = getStore();
    const indicator = store.indicators.find((item) => item.id === id);
    if (!indicator) {
      throw new Error("Indicator bulunamadı.");
    }

    indicator.status =
      indicator.status === "LIVE"
        ? "DISABLED"
        : indicator.status === "SHADOW"
          ? "LIVE"
          : "LIVE";

    return clone(indicator);
  }

  async reviewTrade(tradeId?: string) {
    const store = getStore();
    const existing = tradeId
      ? store.reviews.find((review) => review.tradeId === tradeId)
      : store.reviews[0];
    if (existing) {
      return clone(existing);
    }

    const report: TradeReviewReport = {
      id: `review-${Date.now()}`,
      ownerId: store.settings.ownerId,
      tradeId: tradeId ?? null,
      type: "TRADE_REVIEW",
      summary:
        "Mock modda AI yerine deterministik analiz raporu döndürüldü. Firebase Functions bağlanınca Gemini değerlendirmesi devreye girecek.",
      mistakes: ["Pozisyon sonrası sistem içi açıklama ve not tutulması önerilir."],
      improvements: ["Trade kapanışlarında kapanış nedeni ekle."],
      proposedIndicatorIds: [],
      confidence: 0.65,
      createdAt: new Date().toISOString(),
    };
    store.reviews.unshift(report);
    return clone(report);
  }

  async suggestIndicators(_context?: string) {
    return clone(getStore().proposals);
  }
}
