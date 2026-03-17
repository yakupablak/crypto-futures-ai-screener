import type {
  IndicatorDefinition,
  IndicatorProposal,
  MarketUniverseEntry,
  ScanRun,
  SignalCandidate,
  SignalSnapshot,
  TradeJournalEntry,
  TradeReviewReport,
  UserSettings,
} from "@crypto-futures/shared";

import { getDb } from "./admin";
import { config } from "./config";

const SETTINGS_DOC_ID = "default";

function sortByDateDesc<T>(items: T[], selector: (item: T) => string | null | undefined) {
  return [...items].sort((left, right) => {
    const leftValue = selector(left) ? new Date(selector(left) as string).getTime() : 0;
    const rightValue = selector(right) ? new Date(selector(right) as string).getTime() : 0;
    return rightValue - leftValue;
  });
}

export async function getSettings(): Promise<UserSettings> {
  const db = getDb();
  const snapshot = await db.collection("settings").doc(SETTINGS_DOC_ID).get();
  if (snapshot.exists) {
    return snapshot.data() as UserSettings;
  }

  const defaults: UserSettings = {
    ownerId: config.ownerId,
    preferredRiskPerTradePct: 1,
    maxSignals: 5,
    whitelistSymbols: [],
    activeIndicatorIds: [],
    scanIntervalMinutes: 15,
    language: "tr",
  };
  await db.collection("settings").doc(SETTINGS_DOC_ID).set(defaults);
  return defaults;
}

export async function listMarketUniverse(): Promise<MarketUniverseEntry[]> {
  const db = getDb();
  const snapshot = await db.collection("marketUniverse").get();
  return snapshot.docs
    .map((doc) => doc.data() as MarketUniverseEntry)
    .filter((entry) => entry.ownerId === config.ownerId && entry.active);
}

export async function replaceMarketUniverse(entries: MarketUniverseEntry[]) {
  const db = getDb();
  const existing = await db
    .collection("marketUniverse")
    .where("ownerId", "==", config.ownerId)
    .get();

  const batch = db.batch();
  existing.docs.forEach((doc) => batch.delete(doc.ref));
  entries.forEach((entry) => batch.set(db.collection("marketUniverse").doc(entry.id), entry));
  await batch.commit();
}

export async function listIndicators(): Promise<IndicatorDefinition[]> {
  const db = getDb();
  const snapshot = await db.collection("indicatorCatalog").get();
  return snapshot.docs
    .map((doc) => doc.data() as IndicatorDefinition)
    .filter((indicator) => indicator.ownerId === config.ownerId);
}

export async function listClosedTrades(limit = 50): Promise<TradeJournalEntry[]> {
  const db = getDb();
  const snapshot = await db.collection("trades").get();
  return sortByDateDesc(
    snapshot.docs
      .map((doc) => doc.data() as TradeJournalEntry)
      .filter((trade) => trade.ownerId === config.ownerId && trade.status === "CLOSED"),
    (trade) => trade.closedAt,
  ).slice(0, limit);
}

export async function getTradeById(id: string) {
  const db = getDb();
  const snapshot = await db.collection("trades").doc(id).get();
  return snapshot.exists ? (snapshot.data() as TradeJournalEntry) : null;
}

export async function listIndicatorProposals() {
  const db = getDb();
  const snapshot = await db.collection("indicatorProposals").get();
  return sortByDateDesc(
    snapshot.docs
      .map((doc) => doc.data() as IndicatorProposal)
      .filter((proposal) => proposal.ownerId === config.ownerId),
    (proposal) => proposal.createdAt,
  );
}

export async function saveIndicatorProposal(proposal: IndicatorProposal) {
  const db = getDb();
  await db.collection("indicatorProposals").doc(proposal.id).set(proposal);
}

export async function saveAIReview(review: TradeReviewReport) {
  const db = getDb();
  await db.collection("aiReviews").doc(review.id).set(review);
}

export async function replaceSignals(
  signals: SignalSnapshot[],
  candidates: SignalCandidate[],
  scanRun: ScanRun,
) {
  const db = getDb();
  const batch = db.batch();

  const existingSignals = await db
    .collection("signals")
    .where("ownerId", "==", config.ownerId)
    .get();
  existingSignals.docs.forEach((doc) => batch.delete(doc.ref));

  const existingCandidates = await db
    .collection("signalCandidates")
    .where("ownerId", "==", config.ownerId)
    .get();
  existingCandidates.docs.forEach((doc) => batch.delete(doc.ref));

  signals.forEach((signal) => {
    batch.set(db.collection("signals").doc(signal.id), signal);
  });
  candidates.forEach((candidate) => {
    batch.set(db.collection("signalCandidates").doc(candidate.id), candidate);
  });
  batch.set(db.collection("scanRuns").doc(scanRun.id), scanRun);
  batch.set(db.collection("marketState").doc("latest"), {
    ownerId: config.ownerId,
    latestScanId: scanRun.id,
    updatedAt: scanRun.completedAt,
  });

  await batch.commit();
}

export async function saveIndicator(indicator: IndicatorDefinition) {
  const db = getDb();
  await db.collection("indicatorCatalog").doc(indicator.id).set(indicator);
}

export async function updateProposalStatus(id: string, status: "APPROVED" | "REJECTED") {
  const db = getDb();
  await db.collection("indicatorProposals").doc(id).update({
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function toggleIndicatorState(id: string) {
  const db = getDb();
  const snapshot = await db.collection("indicatorCatalog").doc(id).get();
  if (!snapshot.exists) {
    throw new Error("Indicator not found");
  }
  const indicator = snapshot.data() as IndicatorDefinition;
  const nextStatus: IndicatorDefinition["status"] =
    indicator.status === "LIVE"
      ? "DISABLED"
      : indicator.status === "SHADOW"
        ? "LIVE"
        : "LIVE";
  const updated = {
    ...indicator,
    status: nextStatus,
  };
  await db.collection("indicatorCatalog").doc(id).set(updated);
  return updated;
}
