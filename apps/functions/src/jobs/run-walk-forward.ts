import {
  fetchKlines,
  runWalkForwardBacktest,
  type WalkForwardInput,
} from "@crypto-futures/analysis-core";
import { createLogger } from "@crypto-futures/shared";

import { config } from "../lib/config";
import {
  listIndicators,
  listMarketUniverse,
  saveWalkForwardSummary,
} from "../lib/persistence";

const logger = createLogger("runWalkForwardJob");

const DAILY_LIMIT = 320;
const FOUR_HOUR_LIMIT = 420;
const FETCH_CONCURRENCY = 4;
const MAX_WALK_FORWARD_SYMBOLS = 24;

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

export async function runWalkForwardJob() {
  const startedAt = Date.now();
  const [universe, indicators] = await Promise.all([listMarketUniverse(), listIndicators()]);
  const selectedUniverse = universe.slice(0, MAX_WALK_FORWARD_SYMBOLS);

  logger.info("Walk-forward backtest started", {
    selectedSymbols: selectedUniverse.length,
    indicatorCount: indicators.length,
    dailyLimit: DAILY_LIMIT,
    fourHourLimit: FOUR_HOUR_LIMIT,
  });

  const rawMarkets = await mapWithConcurrency(
    selectedUniverse,
    FETCH_CONCURRENCY,
    async (entry) =>
      ({
        symbol: entry.symbol,
        coinName: entry.coinName,
        dailyCandles: await fetchKlines(entry.symbol, "1d", DAILY_LIMIT),
        fourHourCandles: await fetchKlines(entry.symbol, "4h", FOUR_HOUR_LIMIT),
      }) satisfies WalkForwardInput,
  );

  const eligibleMarkets = rawMarkets.filter(
    (market) => market.dailyCandles.length >= 220 && market.fourHourCandles.length >= 260,
  );

  const summary = runWalkForwardBacktest(eligibleMarkets, indicators, {
    ownerId: config.ownerId,
  });

  const nextSummary = {
    ...summary,
    notes: [
      ...summary.notes,
      `Backtest evreni ilk ${selectedUniverse.length} market cap coin ile sinirlandi.`,
      `Yeterli history bulunan coin sayisi: ${eligibleMarkets.length}.`,
      `4H test penceresi ${FOUR_HOUR_LIMIT} kapali mum ustunden replay edildi.`,
    ],
  };

  await saveWalkForwardSummary(nextSummary);

  const durationMs = Date.now() - startedAt;
  const result = {
    symbolsEvaluated: nextSummary.symbolsEvaluated,
    eligibleSymbols: eligibleMarkets.length,
    totalSignals: nextSummary.totalSignals,
    testSignals: nextSummary.testSignals,
    testExpectancyR: nextSummary.testExpectancyR,
    testWinRate: nextSummary.testWinRate,
    signalDensityPer100Bars: nextSummary.signalDensityPer100Bars,
    durationMs,
  };

  if (nextSummary.totalSignals === 0) {
    logger.warn("Walk-forward backtest completed with zero signals", result);
  } else if (nextSummary.testExpectancyR < 0) {
    logger.warn("Walk-forward backtest completed with negative test expectancy", result);
  } else {
    logger.info("Walk-forward backtest completed", result);
  }

  return result;
}
