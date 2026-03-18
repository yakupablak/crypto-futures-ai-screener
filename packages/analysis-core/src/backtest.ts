import type {
  IndicatorDefinition,
  SetupType,
  TradeSide,
  WalkForwardSummary,
} from "@crypto-futures/shared";

import { analyzeMarketSymbolDetailed, type MarketSymbolInput } from "./engine";

interface BacktestOutcome {
  symbol: string;
  setup: SetupType;
  side: TradeSide;
  triggeredAt: string;
  realizedR: number;
  realizedPnlPct: number;
  barsHeld: number;
}

export interface WalkForwardInput {
  symbol: string;
  coinName: string;
  dailyCandles: MarketSymbolInput["dailyCandles"];
  fourHourCandles: MarketSymbolInput["fourHourCandles"];
}

export interface WalkForwardOptions {
  ownerId?: string;
}

const LEVERAGE = 2;
const MIN_TEST_SIGNALS = 1;

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function computeProfitFactor(values: number[]) {
  const gains = values.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  const losses = Math.abs(values.filter((value) => value < 0).reduce((sum, value) => sum + value, 0));

  if (losses === 0) {
    return null;
  }

  return Number((gains / losses).toFixed(3));
}

function simulateOutcome(
  side: TradeSide,
  entry: number,
  stop: number,
  tp1: number,
  tp2: number,
  futureCandles: WalkForwardInput["fourHourCandles"],
): Omit<BacktestOutcome, "symbol" | "setup" | "side" | "triggeredAt"> {
  const risk = Math.abs(entry - stop);

  for (let index = 0; index < futureCandles.length; index += 1) {
    const candle = futureCandles[index];

    if (side === "LONG") {
      const hitStop = candle.low <= stop;
      const hitTp2 = candle.high >= tp2;
      const hitTp1 = candle.high >= tp1;

      if (hitStop && (hitTp1 || hitTp2)) {
        return { realizedR: -1, realizedPnlPct: Number((((stop - entry) / entry) * 100 * LEVERAGE).toFixed(3)), barsHeld: index + 1 };
      }
      if (hitStop) {
        return { realizedR: -1, realizedPnlPct: Number((((stop - entry) / entry) * 100 * LEVERAGE).toFixed(3)), barsHeld: index + 1 };
      }
      if (hitTp2) {
        return { realizedR: Number(((tp2 - entry) / risk).toFixed(3)), realizedPnlPct: Number((((tp2 - entry) / entry) * 100 * LEVERAGE).toFixed(3)), barsHeld: index + 1 };
      }
      if (hitTp1) {
        return { realizedR: Number(((tp1 - entry) / risk).toFixed(3)), realizedPnlPct: Number((((tp1 - entry) / entry) * 100 * LEVERAGE).toFixed(3)), barsHeld: index + 1 };
      }
    } else {
      const hitStop = candle.high >= stop;
      const hitTp2 = candle.low <= tp2;
      const hitTp1 = candle.low <= tp1;

      if (hitStop && (hitTp1 || hitTp2)) {
        return { realizedR: -1, realizedPnlPct: Number((((entry - stop) / entry) * 100 * LEVERAGE).toFixed(3)), barsHeld: index + 1 };
      }
      if (hitStop) {
        return { realizedR: -1, realizedPnlPct: Number((((entry - stop) / entry) * 100 * LEVERAGE).toFixed(3)), barsHeld: index + 1 };
      }
      if (hitTp2) {
        return { realizedR: Number(((entry - tp2) / risk).toFixed(3)), realizedPnlPct: Number((((entry - tp2) / entry) * 100 * LEVERAGE).toFixed(3)), barsHeld: index + 1 };
      }
      if (hitTp1) {
        return { realizedR: Number(((entry - tp1) / risk).toFixed(3)), realizedPnlPct: Number((((entry - tp1) / entry) * 100 * LEVERAGE).toFixed(3)), barsHeld: index + 1 };
      }
    }
  }

  const lastFuture = futureCandles[futureCandles.length - 1];
  const reward = side === "LONG" ? lastFuture.close - entry : entry - lastFuture.close;
  return {
    realizedR: risk === 0 ? 0 : Number((reward / risk).toFixed(3)),
    realizedPnlPct: Number(((reward / entry) * 100 * LEVERAGE).toFixed(3)),
    barsHeld: futureCandles.length,
  };
}

function summarizeSlice(outcomes: BacktestOutcome[]) {
  const pnl = outcomes.map((outcome) => outcome.realizedPnlPct);
  const rValues = outcomes.map((outcome) => outcome.realizedR);
  const wins = outcomes.filter((outcome) => outcome.realizedR > 0).length;

  return {
    signals: outcomes.length,
    winRate:
      outcomes.length === 0 ? 0 : Number(((wins / outcomes.length) * 100).toFixed(2)),
    expectancyR: Number(average(rValues).toFixed(3)),
    averagePnlPct: Number(average(pnl).toFixed(3)),
    profitFactor: computeProfitFactor(pnl),
    averageBarsHeld: Number(average(outcomes.map((outcome) => outcome.barsHeld)).toFixed(2)),
  };
}

export function runWalkForwardBacktest(
  universe: WalkForwardInput[],
  indicatorCatalog: IndicatorDefinition[] = [],
  options: WalkForwardOptions = {},
): WalkForwardSummary {
  const outcomes: BacktestOutcome[] = [];
  let barsEvaluated = 0;

  for (const market of universe) {
    const fourHourCandles = market.fourHourCandles;

    for (let index = 219; index < fourHourCandles.length - 1; index += 1) {
      const currentFourHour = fourHourCandles.slice(0, index + 1);
      const currentTime = currentFourHour[currentFourHour.length - 1].closeTime;
      const currentDaily = market.dailyCandles.filter((candle) => candle.closeTime <= currentTime);
      barsEvaluated += 1;

      const analysis = analyzeMarketSymbolDetailed(
        {
          ownerId: "walk-forward",
          symbol: market.symbol,
          coinName: market.coinName,
          dailyCandles: currentDaily,
          fourHourCandles: currentFourHour,
        },
        indicatorCatalog,
      );

      if (!analysis.candidate) {
        continue;
      }

      const futureCandles = fourHourCandles.slice(index + 1, index + 13);
      if (futureCandles.length === 0) {
        continue;
      }

      const simulated = simulateOutcome(
        analysis.candidate.side,
        analysis.candidate.entry,
        analysis.candidate.stop,
        analysis.candidate.tp1,
        analysis.candidate.tp2,
        futureCandles,
      );

      outcomes.push({
        symbol: market.symbol,
        setup: analysis.candidate.setup,
        side: analysis.candidate.side,
        triggeredAt: new Date(currentTime).toISOString(),
        ...simulated,
      });
    }
  }

  const orderedOutcomes = [...outcomes].sort(
    (left, right) => new Date(left.triggeredAt).getTime() - new Date(right.triggeredAt).getTime(),
  );
  const splitIndex = Math.max(MIN_TEST_SIGNALS, Math.floor(orderedOutcomes.length * 0.7));
  const train = orderedOutcomes.slice(0, splitIndex);
  const test = orderedOutcomes.slice(splitIndex);
  const effectiveTest = test.length > 0 ? test : train;

  const trainSummary = summarizeSlice(train);
  const testSummary = summarizeSlice(effectiveTest);

  const setupBreakdown = ["BREAKOUT_RETEST", "SUPPORT_BOUNCE", "CONSOLIDATION_BREAKOUT"]
    .map((setup) => {
      const subset = effectiveTest.filter((outcome) => outcome.setup === setup);
      const summary = summarizeSlice(subset);
      return {
        setup: setup as SetupType,
        signals: summary.signals,
        winRate: summary.winRate,
        expectancyR: summary.expectancyR,
      };
    })
    .filter((item) => item.signals > 0);

  return {
    ownerId: options.ownerId ?? "local-owner",
    updatedAt: new Date().toISOString(),
    symbolsEvaluated: universe.length,
    barsEvaluated,
    totalSignals: orderedOutcomes.length,
    trainSignals: train.length,
    testSignals: effectiveTest.length,
    trainWinRate: trainSummary.winRate,
    testWinRate: testSummary.winRate,
    trainExpectancyR: trainSummary.expectancyR,
    testExpectancyR: testSummary.expectancyR,
    testAveragePnlPct: testSummary.averagePnlPct,
    testProfitFactor: testSummary.profitFactor,
    averageBarsHeld: testSummary.averageBarsHeld,
    signalDensityPer100Bars:
      barsEvaluated === 0 ? 0 : Number(((orderedOutcomes.length / barsEvaluated) * 100).toFixed(2)),
    setupBreakdown,
    notes: [
      "Walk-forward raporu core deterministic kurallar uzerinden hesaplandi.",
      "Funding ve open interest tarihsel replay'i bu surumde tam geri sarilmadi.",
      `Out-of-sample kesiti ${effectiveTest.length} signal uzerinden olculdu.`,
    ],
  };
}
