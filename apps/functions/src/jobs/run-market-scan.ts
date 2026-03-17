import {
  analyzeMarketSymbolDetailed,
  type AnalysisRejectionReason,
  fetchFundingRateHistory,
  fetchKlines,
  fetchOpenInterestHistory,
  rankSignals,
} from "@crypto-futures/analysis-core";
import type { MarketSymbolInput } from "@crypto-futures/analysis-core";
import { createLogger, type SignalCandidate, type SignalSnapshot } from "@crypto-futures/shared";

import { config } from "../lib/config";
import { getSettings, listIndicators, listMarketUniverse, replaceSignals } from "../lib/persistence";

const logger = createLogger("runMarketScanJob");

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let cursor = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await task(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
}

function summarizeRejections(
  results: Array<{ rejectionReason: AnalysisRejectionReason | null }>,
) {
  const counters: Record<AnalysisRejectionReason, number> = {
    TREND_NEUTRAL: 0,
    RSI_FILTER: 0,
    NO_SETUP: 0,
    INVALID_TARGET: 0,
  };

  for (const result of results) {
    if (result.rejectionReason) {
      counters[result.rejectionReason] += 1;
    }
  }

  return counters;
}

export async function runMarketScanJob() {
  const startedAt = Date.now();
  const [settings, universe, indicators] = await Promise.all([
    getSettings(),
    listMarketUniverse(),
    listIndicators(),
  ]);

  const activeUniverse = universe.slice(0, 220);
  logger.info("Market scan started", {
    activeUniverseCount: activeUniverse.length,
    indicatorCount: indicators.length,
    maxSignals: settings.maxSignals,
  });

  const preliminaryInputs = await mapWithConcurrency(activeUniverse, 6, async (entry) => {
    const [dailyCandles, fourHourCandles] = await Promise.all([
      fetchKlines(entry.symbol, "1d", 260),
      fetchKlines(entry.symbol, "4h", 260),
    ]);

    return {
      ownerId: config.ownerId,
      symbol: entry.symbol,
      coinName: entry.coinName,
      dailyCandles,
      fourHourCandles,
    } satisfies MarketSymbolInput;
  });

  const preliminaryAnalysis = preliminaryInputs.map((input) =>
    analyzeMarketSymbolDetailed(input, indicators),
  );
  const rejectionSummary = summarizeRejections(preliminaryAnalysis);

  const initialRanking = rankSignals(preliminaryInputs, indicators);
  const shortlist = initialRanking.candidates.slice(0, 20).map((candidate) => candidate.symbol);

  const enhancedInputs = await mapWithConcurrency(
    preliminaryInputs.filter((input) => shortlist.includes(input.symbol)),
    4,
    async (input) => ({
      ...input,
      fundingHistory: await fetchFundingRateHistory(input.symbol, 30),
      openInterestHistory: await fetchOpenInterestHistory(input.symbol, "4h", 30),
    }),
  );

  const shortlistMap = new Map(enhancedInputs.map((input) => [input.symbol, input]));
  const mergedInputs = preliminaryInputs.map((input) => shortlistMap.get(input.symbol) ?? input);
  const ranking = rankSignals(mergedInputs, indicators);

  const scanId = `scan-${Date.now()}`;
  const topSignals: SignalSnapshot[] = ranking.topSignals.slice(0, settings.maxSignals).map((signal, index) => ({
    ...signal,
    id: `${scanId}-${signal.symbol.toLowerCase()}-${index + 1}`,
  }));
  const topSymbols = new Set(topSignals.map((signal) => signal.symbol));
  const candidates: SignalCandidate[] = ranking.candidates.map((candidate, index) => ({
    ...candidate,
    id: `${scanId}-${candidate.symbol.toLowerCase()}-${index + 1}`,
    rankingPosition: index + 1,
  }));

  const scanRun = {
    id: scanId,
    ownerId: config.ownerId,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    scannedSymbols: activeUniverse.length,
    shortlistedSymbols: candidates.length,
    topSignalIds: candidates
      .filter((candidate) => topSymbols.has(candidate.symbol))
      .slice(0, settings.maxSignals)
      .map((candidate) => candidate.id),
    notes: [
      `Tarama evreni: ${activeUniverse.length} coin`,
      `Trend uyumsuz veya EMA200 yakinligi nedeniyle elenen: ${rejectionSummary.TREND_NEUTRAL}`,
      `RSI filtresinden elenen: ${rejectionSummary.RSI_FILTER}`,
      `Setup bulunamayan: ${rejectionSummary.NO_SETUP}`,
      `Funding/OI derin inceleme yapilan shortlist: ${shortlist.length}`,
      "Dynamic indicator catalog skora dahil edildi.",
    ],
  };

  await replaceSignals(topSignals, candidates, scanRun);

  const durationMs = Date.now() - startedAt;
  const logPayload = {
    durationMs,
    scannedSymbols: activeUniverse.length,
    shortlistCount: shortlist.length,
    candidateCount: candidates.length,
    signalCount: topSignals.length,
    rejectionSummary,
  };

  if (activeUniverse.length < 200) {
    logger.warn("Market scan universe is below requested 200+ target", logPayload);
  } else if (candidates.length === 0) {
    logger.warn("Market scan completed with zero candidates", logPayload);
  } else {
    logger.info("Market scan completed", logPayload);
  }

  return {
    signalCount: topSignals.length,
    candidateCount: candidates.length,
    scannedSymbols: activeUniverse.length,
    shortlistCount: shortlist.length,
    rejectionSummary,
    durationMs,
  };
}

