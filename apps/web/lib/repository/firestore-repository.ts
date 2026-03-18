import {
  buildIndicatorDefinitionFingerprint,
  createTradePayloadSchema,
  dedupeIndicatorProposals,
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
import { FieldValue } from "firebase-admin/firestore";

import {
  generateIndicatorProposals,
  generateTradeReview,
} from "../../../functions/src/lib/gemini";
import { env } from "@/lib/env";
import { getAdminDb } from "@/lib/firebase/admin";

import type { DashboardData, DataRepository } from "./types";

const SETTINGS_DOC_ID = "default";

async function listOwnedDocuments<T extends { ownerId?: string }>(name: string) {
  const db = getAdminDb();
  if (!db) {
    throw new Error("Firebase admin yapilandirmasi eksik.");
  }

  const snapshot = await db.collection(name).get();
  return snapshot.docs
    .map((doc) => doc.data() as T)
    .filter((item) => item.ownerId === env.appOwnerId);
}

async function getOwnedMarketStateDocument<
  T extends { ownerId?: string } | null,
>(id: string): Promise<T | null> {
  const db = getAdminDb();
  if (!db) {
    throw new Error("Firebase admin yapilandirmasi eksik.");
  }

  const doc = await db.collection("marketState").doc(id).get();
  if (!doc.exists) {
    return null;
  }

  const data = doc.data() as T;
  if (data && "ownerId" in data && data.ownerId !== env.appOwnerId) {
    return null;
  }

  return data;
}

function sortByNumberDesc<T>(items: T[], selector: (item: T) => number) {
  return [...items].sort((left, right) => selector(right) - selector(left));
}

function sortByDateDesc<T>(items: T[], selector: (item: T) => string | null | undefined) {
  return [...items].sort((left, right) => {
    const leftValue = selector(left) ? new Date(selector(left) as string).getTime() : 0;
    const rightValue = selector(right) ? new Date(selector(right) as string).getTime() : 0;
    return rightValue - leftValue;
  });
}

function buildDefaultSettings(): UserSettings {
  return {
    ownerId: env.appOwnerId,
    preferredRiskPerTradePct: 1,
    maxSignals: 5,
    whitelistSymbols: [],
    activeIndicatorIds: [],
    scanIntervalMinutes: 15,
    language: "tr",
  };
}

function normalizeWhitelistSymbol(rawSymbol: string) {
  const cleaned = rawSymbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) {
    throw new Error("Gecerli bir coin sembolu gir.");
  }

  return cleaned.endsWith("USDT") ? cleaned : `${cleaned}USDT`;
}

function pickLatestProposalByFingerprint(proposals: IndicatorProposal[]) {
  const map = new Map<string, IndicatorProposal>();

  for (const proposal of sortByDateDesc(proposals, (item) => item.createdAt)) {
    const fingerprint = buildIndicatorDefinitionFingerprint(proposal.proposal);
    if (!map.has(fingerprint)) {
      map.set(fingerprint, proposal);
    }
  }

  return map;
}

export class FirestoreRepository implements DataRepository {
  async getDashboardData(): Promise<DashboardData> {
    const [
      signals,
      candidates,
      trades,
      reviews,
      indicators,
      proposals,
      settings,
      scanRuns,
      performance,
      walkForward,
    ] =
      await Promise.all([
        this.getSignals(),
        this.getSignalCandidates(),
        this.getTrades(),
        this.getAIReviews(),
        this.getIndicators(),
        this.getIndicatorProposals(),
        this.getSettings(),
        this.getScanRuns(),
        getOwnedMarketStateDocument<PerformanceSnapshot>("performance"),
        getOwnedMarketStateDocument<WalkForwardSummary>("walkForward"),
      ]);

    return {
      latestScan: scanRuns[0] ?? null,
      signals,
      candidates,
      trades,
      aiReviews: reviews,
      indicators,
      proposals,
      settings,
      performance,
      walkForward,
    };
  }

  async getSignals() {
    const items = await listOwnedDocuments<SignalSnapshot>("signals");
    return sortByDateDesc(items, (item) => item.createdAt).slice(0, 5);
  }

  async getSignalCandidates() {
    const items = await listOwnedDocuments<SignalCandidate>("signalCandidates");
    return sortByNumberDesc(items, (item) => item.score).slice(0, 20);
  }

  async getSignalById(id: string) {
    const db = getAdminDb();
    const doc = await db?.collection("signals").doc(id).get();
    const signal = doc?.exists ? (doc.data() as SignalSnapshot) : null;
    if (!signal || signal.ownerId !== env.appOwnerId) {
      return null;
    }
    return signal;
  }

  async getTrades() {
    const items = await listOwnedDocuments<TradeJournalEntry>("trades");
    return sortByDateDesc(items, (item) => item.openedAt);
  }

  async getSettings() {
    const db = getAdminDb();
    const doc = await db?.collection("settings").doc(SETTINGS_DOC_ID).get();
    if (doc?.exists) {
      return doc.data() as UserSettings;
    }

    const defaults = buildDefaultSettings();
    await db?.collection("settings").doc(SETTINGS_DOC_ID).set(defaults);
    return defaults;
  }

  async getIndicators() {
    const items = await listOwnedDocuments<IndicatorDefinition>("indicatorCatalog");
    return sortByDateDesc(items, (item) => item.createdAt);
  }

  async getIndicatorProposals() {
    const [items, indicators] = await Promise.all([
      listOwnedDocuments<IndicatorProposal>("indicatorProposals"),
      this.getIndicators(),
    ]);

    return dedupeIndicatorProposals(items, indicators);
  }

  async getAIReviews() {
    const items = await listOwnedDocuments<TradeReviewReport>("aiReviews");
    return sortByDateDesc(items, (item) => item.createdAt).slice(0, 10);
  }

  async getScanRuns() {
    const items = await listOwnedDocuments<ScanRun>("scanRuns");
    return sortByDateDesc(items, (item) => item.startedAt).slice(0, 10);
  }

  async createTrade(payload: CreateTradePayload) {
    const parsed = createTradePayloadSchema.parse(payload);
    const db = getAdminDb();
    const signal = await this.getSignalById(parsed.signalId);
    if (!db || !signal) {
      throw new Error("Trade olusturmak icin signal bulunamadi.");
    }

    const trade: TradeJournalEntry = {
      id: `trade-${Date.now()}`,
      ownerId: env.appOwnerId,
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
      notes: parsed.notes ?? "",
    };

    await db.collection("trades").doc(trade.id).set(trade);
    await db.collection("tradeEvents").add({
      ownerId: env.appOwnerId,
      tradeId: trade.id,
      type: "OPENED",
      createdAt: trade.openedAt,
    });
    return trade;
  }

  async closeTrade(id: string, payload: TradeClosePayload) {
    const parsed = tradeClosePayloadSchema.parse(payload);
    const db = getAdminDb();
    if (!db) {
      throw new Error("Firebase admin yapilandirmasi eksik.");
    }

    const tradeDoc = await db.collection("trades").doc(id).get();
    if (!tradeDoc.exists) {
      throw new Error("Trade bulunamadi.");
    }

    const trade = tradeDoc.data() as TradeJournalEntry;
    const risk = Math.abs(trade.entryPrice - trade.stopLoss);
    const reward =
      trade.side === "LONG"
        ? parsed.closePrice - trade.entryPrice
        : trade.entryPrice - parsed.closePrice;

    const nextTrade: TradeJournalEntry = {
      ...trade,
      status: "CLOSED",
      closedAt: new Date().toISOString(),
      closePrice: parsed.closePrice,
      realizedRMultiple: Number((risk === 0 ? 0 : reward / risk).toFixed(2)),
      realizedPnlPct: Number(
        (trade.entryPrice === 0 ? 0 : (reward / trade.entryPrice) * 100 * trade.leverage).toFixed(2),
      ),
      notes: parsed.notes ?? trade.notes,
    };

    await db.collection("trades").doc(id).set(nextTrade);
    await db.collection("tradeEvents").add({
      ownerId: env.appOwnerId,
      tradeId: id,
      type: "CLOSED",
      closePrice: parsed.closePrice,
      createdAt: nextTrade.closedAt,
    });

    return nextTrade;
  }

  async approveIndicatorProposal(id: string) {
    const db = getAdminDb();
    if (!db) {
      throw new Error("Firebase admin yapilandirmasi eksik.");
    }

    const doc = await db.collection("indicatorProposals").doc(id).get();
    if (!doc.exists) {
      throw new Error("Indicator proposal bulunamadi.");
    }

    const proposal = doc.data() as IndicatorProposal;
    const targetFingerprint = buildIndicatorDefinitionFingerprint(proposal.proposal);
    const indicator: IndicatorDefinition = {
      ...proposal.proposal,
      status: "SHADOW",
      approvedAt: new Date().toISOString(),
    };

    const siblingProposals = await listOwnedDocuments<IndicatorProposal>("indicatorProposals");
    const batch = db.batch();
    batch.set(db.collection("indicatorCatalog").doc(indicator.id), indicator);
    batch.update(db.collection("indicatorProposals").doc(id), {
      status: "APPROVED",
      approvedAt: FieldValue.serverTimestamp(),
    });

    siblingProposals
      .filter(
        (item) =>
          item.id !== id &&
          item.status === "PENDING" &&
          buildIndicatorDefinitionFingerprint(item.proposal) === targetFingerprint,
      )
      .forEach((item) => {
        batch.update(db.collection("indicatorProposals").doc(item.id), {
          status: "REJECTED",
          updatedAt: new Date().toISOString(),
        });
      });

    await batch.commit();
    return indicator;
  }

  async toggleIndicator(id: string) {
    const db = getAdminDb();
    if (!db) {
      throw new Error("Firebase admin yapilandirmasi eksik.");
    }

    const doc = await db.collection("indicatorCatalog").doc(id).get();
    if (!doc.exists) {
      throw new Error("Indicator bulunamadi.");
    }

    const indicator = doc.data() as IndicatorDefinition;
    const nextStatus: IndicatorDefinition["status"] =
      indicator.status === "LIVE"
        ? "DISABLED"
        : indicator.status === "SHADOW"
          ? "LIVE"
          : "LIVE";
    const nextIndicator = {
      ...indicator,
      status: nextStatus,
    };

    await db.collection("indicatorCatalog").doc(id).set(nextIndicator);
    return nextIndicator;
  }

  async reviewTrade(tradeId?: string) {
    const db = getAdminDb();
    if (!db) {
      throw new Error("Firebase admin yapilandirmasi eksik.");
    }

    const trades = await this.getTrades();
    const targetTrade =
      (tradeId ? trades.find((trade) => trade.id === tradeId) : trades[0]) ?? null;
    const report = await generateTradeReview(targetTrade);

    await db.collection("aiReviews").doc(report.id).set(report);
    return report;
  }

  async suggestIndicators(context?: string) {
    const db = getAdminDb();
    if (!db) {
      throw new Error("Firebase admin yapilandirmasi eksik.");
    }

    const [trades, indicators, existingProposalItems] = await Promise.all([
      this.getTrades(),
      this.getIndicators(),
      listOwnedDocuments<IndicatorProposal>("indicatorProposals"),
    ]);
    const realizedTrades = trades.filter((trade) => trade.status === "CLOSED");
    const generatedProposals = await generateIndicatorProposals(realizedTrades, indicators, context);
    const normalizedGenerated = dedupeIndicatorProposals(generatedProposals, indicators);
    const existingByFingerprint = pickLatestProposalByFingerprint(
      dedupeIndicatorProposals(existingProposalItems, indicators),
    );
    const liveIndicatorFingerprints = new Set(
      indicators.map((indicator) => buildIndicatorDefinitionFingerprint(indicator)),
    );

    const proposalsToPersist: IndicatorProposal[] = [];
    const responseProposals: IndicatorProposal[] = [];

    for (const proposal of normalizedGenerated) {
      const fingerprint = buildIndicatorDefinitionFingerprint(proposal.proposal);

      if (liveIndicatorFingerprints.has(fingerprint)) {
        const existing = existingByFingerprint.get(fingerprint);
        if (existing) {
          responseProposals.push(existing);
        }
        continue;
      }

      const existing = existingByFingerprint.get(fingerprint);
      if (existing) {
        responseProposals.push(existing);
        continue;
      }

      proposalsToPersist.push(proposal);
      responseProposals.push(proposal);
      existingByFingerprint.set(fingerprint, proposal);
    }

    await Promise.all(
      proposalsToPersist.map((proposal) =>
        db.collection("indicatorProposals").doc(proposal.id).set(proposal),
      ),
    );

    return dedupeIndicatorProposals(responseProposals, indicators);
  }

  async updateWhitelistSymbol(symbol: string, action: "add" | "remove") {
    const db = getAdminDb();
    if (!db) {
      throw new Error("Firebase admin yapilandirmasi eksik.");
    }

    const settings = await this.getSettings();
    const normalizedSymbol = normalizeWhitelistSymbol(symbol);
    const whitelist = new Set(settings.whitelistSymbols);

    if (action === "add") {
      whitelist.add(normalizedSymbol);
    } else {
      whitelist.delete(normalizedSymbol);
    }

    const nextSettings: UserSettings = {
      ...settings,
      whitelistSymbols: [...whitelist].sort(),
    };

    await db.collection("settings").doc(SETTINGS_DOC_ID).set(nextSettings);
    return nextSettings;
  }
}
