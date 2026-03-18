import type {
  Candle,
  FundingSnapshot,
  IndicatorDefinition,
  MarketMetrics,
  OpenInterestPoint,
  SetupType,
  SignalCandidate,
  SignalSnapshot,
  TradeSide,
  TrendDirection,
} from "@crypto-futures/shared";

import { evaluateIndicatorDefinition } from "./dsl";
import {
  atr,
  bollingerBands,
  closes,
  ema,
  highest,
  last,
  lowest,
  percentChange,
  rsi,
  volumeRatio,
} from "./indicators";

const MIN_DAILY_CANDLES = 220;
const MIN_FOUR_HOUR_CANDLES = 220;

export interface MarketSymbolInput {
  ownerId: string;
  symbol: string;
  coinName: string;
  dailyCandles: Candle[];
  fourHourCandles: Candle[];
  fundingHistory?: FundingSnapshot[];
  openInterestHistory?: OpenInterestPoint[];
}

export type AnalysisRejectionReason =
  | "TREND_NEUTRAL"
  | "RSI_FILTER"
  | "NO_SETUP"
  | "INVALID_TARGET"
  | "INSUFFICIENT_DATA";

interface SetupResult {
  setup: SetupType;
  baseScore: number;
  entry: number;
  stop: number;
  reasons: string[];
}

interface TechnicalSnapshotInternal {
  dailyClose: number;
  dailyEma200: number;
  fourHourClose: number;
  fourHourEma200: number;
  rsi: number;
  previousRsi: number | null;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  volumeRatio: number;
  atr: number;
  bbWidth: number;
  dailyDistanceToEmaPct: number;
  fourHourDistanceToEmaPct: number;
}

export interface MarketAnalysisResult {
  symbol: string;
  coinName: string;
  candidate: SignalCandidate | null;
  rejectionReason: AnalysisRejectionReason | null;
}

function isNear(value: number, reference: number, tolerancePct = 0.01) {
  return Math.abs(value - reference) / reference <= tolerancePct;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateOpenInterestTrendPct(openInterestHistory: OpenInterestPoint[]) {
  if (openInterestHistory.length < 2) {
    return null;
  }

  const deltas: number[] = [];
  for (let index = 1; index < openInterestHistory.length; index += 1) {
    const previous = openInterestHistory[index - 1].sumOpenInterestValue;
    const current = openInterestHistory[index].sumOpenInterestValue;
    deltas.push(percentChange(current, previous));
  }

  return Number(average(deltas.slice(-3)).toFixed(2));
}

function calculateMarketMetrics(
  fundingHistory: FundingSnapshot[] = [],
  openInterestHistory: OpenInterestPoint[] = [],
  isCompressed = false,
): MarketMetrics {
  const latestFunding = fundingHistory[fundingHistory.length - 1]?.fundingRate ?? null;
  const recentFundingAverage =
    fundingHistory.length > 0
      ? average(fundingHistory.slice(-3).map((item) => item.fundingRate))
      : null;
  const openInterestTrendPct = calculateOpenInterestTrendPct(openInterestHistory);

  const squeezeBias =
    isCompressed &&
    recentFundingAverage != null &&
    recentFundingAverage < 0 &&
    openInterestTrendPct != null &&
    openInterestTrendPct > 1
      ? "HIGH_SHORT_SQUEEZE"
      : isCompressed &&
            recentFundingAverage != null &&
            recentFundingAverage > 0 &&
            openInterestTrendPct != null &&
            openInterestTrendPct > 1
        ? "HIGH_LONG_SQUEEZE"
        : "NEUTRAL";

  return {
    latestFundingRate: latestFunding,
    openInterestTrendPct,
    squeezeBias,
  };
}

function hasSufficientHistory(dailyCandles: Candle[], fourHourCandles: Candle[]) {
  return (
    dailyCandles.length >= MIN_DAILY_CANDLES &&
    fourHourCandles.length >= MIN_FOUR_HOUR_CANDLES
  );
}

function detectTrend(
  dailyCandles: Candle[],
  fourHourCandles: Candle[],
): { trend: TrendDirection; side: TradeSide | null; notes: string[] } {
  const dailyCloses = closes(dailyCandles);
  const fourHourCloses = closes(fourHourCandles);

  const dailyEma = last(ema(dailyCloses, 200));
  const fourHourEma = last(ema(fourHourCloses, 200));
  const dailyClose = last(dailyCloses);
  const fourHourClose = last(fourHourCloses);

  if (isNear(dailyClose, dailyEma, 0.008) || isNear(fourHourClose, fourHourEma, 0.008)) {
    return {
      trend: "NEUTRAL",
      side: null,
      notes: ["Fiyat EMA200 cevresinde kaldigi icin filtre disi birakildi."],
    };
  }

  if (dailyClose > dailyEma && fourHourClose > fourHourEma) {
    return {
      trend: "LONG",
      side: "LONG",
      notes: ["1D ve 4H EMA200 uzerinde trend uyumu mevcut."],
    };
  }

  if (dailyClose < dailyEma && fourHourClose < fourHourEma) {
    return {
      trend: "SHORT",
      side: "SHORT",
      notes: ["1D ve 4H EMA200 altinda trend uyumu mevcut."],
    };
  }

  return {
    trend: "NEUTRAL",
    side: null,
    notes: ["1D ve 4H trend yonu uyumsuz oldugu icin elendi."],
  };
}

function buildTechnicalSnapshot(dailyCandles: Candle[], fourHourCandles: Candle[]): TechnicalSnapshotInternal {
  const dailyCloses = closes(dailyCandles);
  const fourHourCloses = closes(fourHourCandles);
  const fourHourBands = bollingerBands(fourHourCloses, 20);
  const rsiSeries = rsi(fourHourCloses, 14);

  const dailyClose = last(dailyCloses);
  const dailyEma200 = last(ema(dailyCloses, 200));
  const fourHourClose = last(fourHourCloses);
  const fourHourEma200 = last(ema(fourHourCloses, 200));

  return {
    dailyClose,
    dailyEma200,
    fourHourClose,
    fourHourEma200,
    rsi: last(rsiSeries),
    previousRsi: rsiSeries.length > 1 ? rsiSeries[rsiSeries.length - 2] : null,
    bollingerUpper: last(fourHourBands).upper,
    bollingerMiddle: last(fourHourBands).middle,
    bollingerLower: last(fourHourBands).lower,
    volumeRatio: volumeRatio(fourHourCandles, 20),
    atr: last(atr(fourHourCandles, 14)),
    bbWidth: last(fourHourBands).width,
    dailyDistanceToEmaPct: Math.abs(dailyClose - dailyEma200) / dailyEma200,
    fourHourDistanceToEmaPct: Math.abs(fourHourClose - fourHourEma200) / fourHourEma200,
  };
}

function volumeRatioForOffset(candles: Candle[], offsetFromEnd: number, period = 20) {
  const targetIndex = candles.length - 1 - offsetFromEnd;
  const baselineStart = targetIndex - period;

  if (targetIndex < 0 || baselineStart < 0) {
    return 1;
  }

  const baseline = candles.slice(baselineStart, targetIndex).map((candle) => candle.volume);
  if (baseline.length < period) {
    return 1;
  }

  const baselineAverage = average(baseline);
  if (!Number.isFinite(baselineAverage) || baselineAverage === 0) {
    return 1;
  }

  return candles[targetIndex].volume / baselineAverage;
}

function detectBreakoutRetest(
  side: TradeSide,
  fourHourCandles: Candle[],
  technicalSnapshot: TechnicalSnapshotInternal,
): SetupResult | null {
  const candleHighs = fourHourCandles.map((candle) => candle.high);
  const candleLows = fourHourCandles.map((candle) => candle.low);
  const recentResistance = last(highest(candleHighs.slice(0, -2), 20));
  const recentSupport = last(lowest(candleLows.slice(0, -2), 20));
  const latest = fourHourCandles[fourHourCandles.length - 1];
  const previous = fourHourCandles[fourHourCandles.length - 2];
  const breakoutVolumeRatio = volumeRatioForOffset(fourHourCandles, 1, 20);

  if (side === "LONG") {
    const breakout = previous.close > recentResistance && breakoutVolumeRatio > 1.2;
    const retestHold =
      latest.low <= recentResistance * 1.005 &&
      latest.close >= recentResistance &&
      latest.close >= latest.open * 0.995;

    if (breakout && retestHold) {
      return {
        setup: "BREAKOUT_RETEST",
        baseScore: 33,
        entry: latest.close,
        stop: Math.min(latest.low, recentResistance) - technicalSnapshot.atr * 0.35,
        reasons: [
          "Direnc kirilimi sonrasi retest yapildi.",
          "Retest bolgesinde tutunma devam ediyor.",
          "Kirilim mumu hacimle teyit edildi.",
        ],
      };
    }
  }

  if (side === "SHORT") {
    const breakdown = previous.close < recentSupport && breakoutVolumeRatio > 1.2;
    const retestReject =
      latest.high >= recentSupport * 0.995 &&
      latest.close <= recentSupport &&
      latest.close <= latest.open * 1.005;

    if (breakdown && retestReject) {
      return {
        setup: "BREAKOUT_RETEST",
        baseScore: 33,
        entry: latest.close,
        stop: Math.max(latest.high, recentSupport) + technicalSnapshot.atr * 0.35,
        reasons: [
          "Destek kaybi sonrasi retest reddi goruluyor.",
          "Retest bolgesinde satici baskisi suruyor.",
          "Kirilan seviye hacimle teyit edildi.",
        ],
      };
    }
  }

  return null;
}

function detectSupportBounce(
  side: TradeSide,
  fourHourCandles: Candle[],
  technicalSnapshot: TechnicalSnapshotInternal,
): SetupResult | null {
  const latest = fourHourCandles[fourHourCandles.length - 1];
  const recentSwingLow = Math.min(...fourHourCandles.slice(-12).map((candle) => candle.low));
  const recentSwingHigh = Math.max(...fourHourCandles.slice(-12).map((candle) => candle.high));

  if (side === "LONG") {
    const lowerBandBounce =
      latest.low <= technicalSnapshot.bollingerLower * 1.01 && latest.close > latest.open;
    const middleBandSupport =
      latest.low <= technicalSnapshot.bollingerMiddle * 1.008 &&
      latest.close >= technicalSnapshot.bollingerMiddle &&
      latest.close >= latest.open;

    if (lowerBandBounce || middleBandSupport) {
      return {
        setup: "SUPPORT_BOUNCE",
        baseScore: 28,
        entry: latest.close,
        stop: recentSwingLow - technicalSnapshot.atr * 0.25,
        reasons: [
          lowerBandBounce
            ? "Lower band bounce ile destekten tepki alindi."
            : "Middle band support ile tutunma saglandi.",
          "RSI long bounce veya 50 kirilimi ile uyumlu.",
        ],
      };
    }
  }

  if (side === "SHORT") {
    const upperBandReject =
      latest.high >= technicalSnapshot.bollingerUpper * 0.99 &&
      latest.close <= technicalSnapshot.bollingerUpper &&
      latest.close < latest.open;

    if (upperBandReject) {
      return {
        setup: "SUPPORT_BOUNCE",
        baseScore: 28,
        entry: latest.close,
        stop: recentSwingHigh + technicalSnapshot.atr * 0.25,
        reasons: [
          "Upper band rejection ile satis baskisi teyit edildi.",
          "RSI 60-70 bolgesinde rejection davranisi goruluyor.",
        ],
      };
    }
  }

  return null;
}

function detectConsolidationBreakout(
  side: TradeSide,
  fourHourCandles: Candle[],
  technicalSnapshot: TechnicalSnapshotInternal,
): SetupResult | null {
  const rangeCandles = fourHourCandles.slice(-13, -1);
  const latest = fourHourCandles[fourHourCandles.length - 1];
  const rangeHigh = Math.max(...rangeCandles.map((candle) => candle.high));
  const rangeLow = Math.min(...rangeCandles.map((candle) => candle.low));
  const compression = (rangeHigh - rangeLow) / latest.close;

  if (compression > 0.045 || technicalSnapshot.bbWidth > 0.06) {
    return null;
  }

  if (side === "LONG" && latest.close > rangeHigh && technicalSnapshot.volumeRatio > 1.25) {
    return {
      setup: "CONSOLIDATION_BREAKOUT",
      baseScore: 31,
      entry: latest.close,
      stop: rangeLow - technicalSnapshot.atr * 0.2,
      reasons: [
        "Yatay sikisma sonrasi yukari breakout goruluyor.",
        "Daralan Bollinger yapisi genislemeye basladi.",
        "Breakout hacimle desteklendi.",
      ],
    };
  }

  if (side === "SHORT" && latest.close < rangeLow && technicalSnapshot.volumeRatio > 1.25) {
    return {
      setup: "CONSOLIDATION_BREAKOUT",
      baseScore: 31,
      entry: latest.close,
      stop: rangeHigh + technicalSnapshot.atr * 0.2,
      reasons: [
        "Yatay sikisma sonrasi asagi breakout goruluyor.",
        "Daralan Bollinger yapisi genislemeye basladi.",
        "Breakdown hacimle desteklendi.",
      ],
    };
  }

  return null;
}

function detectSetup(
  side: TradeSide,
  fourHourCandles: Candle[],
  technicalSnapshot: TechnicalSnapshotInternal,
) {
  return (
    detectBreakoutRetest(side, fourHourCandles, technicalSnapshot) ??
    detectConsolidationBreakout(side, fourHourCandles, technicalSnapshot) ??
    detectSupportBounce(side, fourHourCandles, technicalSnapshot)
  );
}

function buildTargets(side: TradeSide, entry: number, stop: number) {
  const risk = Math.abs(entry - stop);
  if (risk === 0) {
    return null;
  }

  return side === "LONG"
    ? {
        tp1: entry + risk * 1.5,
        tp2: entry + risk * 2.7,
        riskReward: 2.7,
      }
    : {
        tp1: entry - risk * 1.5,
        tp2: entry - risk * 2.7,
        riskReward: 2.7,
      };
}

function evaluateRsiValidation(side: TradeSide, rsiValue: number, previousRsi: number | null) {
  if (rsiValue > 80 || rsiValue < 20) {
    return { allowed: false, notes: ["RSI ekstrem bolgede oldugu icin sinyal elendi."] };
  }

  if (side === "LONG") {
    const bounce = rsiValue >= 40 && rsiValue <= 55 && previousRsi != null && rsiValue >= previousRsi;
    const crossAbove50 = previousRsi != null && previousRsi < 50 && rsiValue >= 50;

    return {
      allowed: bounce || crossAbove50,
      notes: bounce || crossAbove50 ? [] : ["LONG icin RSI bounce veya 50 kirilimi teyit edilmedi."],
    };
  }

  const rejection =
    rsiValue >= 60 && rsiValue <= 70 && previousRsi != null && rsiValue <= previousRsi;

  return {
    allowed: rejection,
    notes: rejection ? [] : ["SHORT icin RSI rejection bolgesi teyit edilmedi."],
  };
}

export function analyzeMarketSymbolDetailed(
  input: MarketSymbolInput,
  indicatorCatalog: IndicatorDefinition[] = [],
): MarketAnalysisResult {
  if (!hasSufficientHistory(input.dailyCandles, input.fourHourCandles)) {
    return {
      symbol: input.symbol,
      coinName: input.coinName,
      candidate: null,
      rejectionReason: "INSUFFICIENT_DATA",
    };
  }

  const trend = detectTrend(input.dailyCandles, input.fourHourCandles);
  if (trend.side == null) {
    return {
      symbol: input.symbol,
      coinName: input.coinName,
      candidate: null,
      rejectionReason: "TREND_NEUTRAL",
    };
  }

  const technicalSnapshot = buildTechnicalSnapshot(input.dailyCandles, input.fourHourCandles);
  const rsiValidation = evaluateRsiValidation(
    trend.side,
    technicalSnapshot.rsi,
    technicalSnapshot.previousRsi,
  );
  if (!rsiValidation.allowed) {
    return {
      symbol: input.symbol,
      coinName: input.coinName,
      candidate: null,
      rejectionReason: "RSI_FILTER",
    };
  }

  const setup = detectSetup(trend.side, input.fourHourCandles, technicalSnapshot);
  if (!setup) {
    return {
      symbol: input.symbol,
      coinName: input.coinName,
      candidate: null,
      rejectionReason: "NO_SETUP",
    };
  }

  const targets = buildTargets(trend.side, setup.entry, setup.stop);
  if (!targets) {
    return {
      symbol: input.symbol,
      coinName: input.coinName,
      candidate: null,
      rejectionReason: "INVALID_TARGET",
    };
  }

  const marketMetrics = calculateMarketMetrics(
    input.fundingHistory,
    input.openInterestHistory,
    technicalSnapshot.bbWidth < 0.05,
  );

  let score = setup.baseScore;
  const reasons = [...trend.notes, ...setup.reasons, ...rsiValidation.notes];
  const penalties: string[] = [];
  const bonuses: string[] = [];

  score += trend.side === "LONG" ? 18 : 17;
  score += Math.min(10, Math.max(0, (technicalSnapshot.volumeRatio - 1) * 10));

  if (
    technicalSnapshot.dailyDistanceToEmaPct < 0.015 ||
    technicalSnapshot.fourHourDistanceToEmaPct < 0.015
  ) {
    score -= 4;
    penalties.push("Fiyat EMA200 bolgesine gore fazla yakin.");
  }

  if (marketMetrics.squeezeBias === "HIGH_SHORT_SQUEEZE" && trend.side === "LONG") {
    score += 6;
    bonuses.push("Negatif funding ve artan OI short squeeze lehine.");
  }

  if (marketMetrics.squeezeBias === "HIGH_LONG_SQUEEZE" && trend.side === "SHORT") {
    score += 6;
    bonuses.push("Pozitif funding ve artan OI crowded-long baskisi olusturuyor.");
  }

  if (setup.setup !== "SUPPORT_BOUNCE" && technicalSnapshot.volumeRatio < 1.15) {
    score -= 8;
    penalties.push("Breakout yapisi icin hacim zayif kaldi.");
  }

  if (Math.abs(setup.entry - setup.stop) / setup.entry > 0.06) {
    score -= 6;
    penalties.push("Stop mesafesi genis, verimlilik dusuyor.");
  }

  const dynamicIndicatorHits = indicatorCatalog
    .filter((indicator) => indicator.status === "LIVE" || indicator.status === "SHADOW")
    .map((indicator) =>
      evaluateIndicatorDefinition(indicator, {
        candlesByTimeframe: {
          "1D": input.dailyCandles,
          "4H": input.fourHourCandles,
          "1H": input.fourHourCandles,
          "15M": input.fourHourCandles,
        },
        marketMetrics,
      }),
    )
    .filter((hit): hit is NonNullable<typeof hit> => hit != null);

  for (const hit of dynamicIndicatorHits) {
    if (hit.status === "LIVE") {
      score += hit.scoreAdjustment;
      bonuses.push(hit.reason);
    } else {
      bonuses.push(`${hit.reason} (shadow)`);
    }
  }

  reasons.push(...bonuses);

  const confidenceBase = 0.54 + Math.min(0.28, score / 220);
  const confidencePenalty = penalties.length * 0.03;
  const confidence = Math.min(0.95, Math.max(0.3, confidenceBase - confidencePenalty));

  const summary =
    trend.side === "LONG"
      ? `${input.symbol} icin ${setup.setup} yapisi long yone egiliyor. Trend EMA200 uzerinde, RSI teyidi mevcut ve risk/odul dengesi islenebilir durumda.`
      : `${input.symbol} icin ${setup.setup} yapisi short yone egiliyor. Trend EMA200 altinda, RSI rejection teyidi mevcut ve risk/odul dengesi islenebilir durumda.`;

  return {
    symbol: input.symbol,
    coinName: input.coinName,
    rejectionReason: null,
    candidate: {
      id: `${input.symbol.toLowerCase()}-${setup.setup.toLowerCase()}-${Date.now()}`,
      ownerId: input.ownerId,
      symbol: input.symbol,
      coinName: input.coinName,
      trend: trend.trend,
      setup: setup.setup,
      side: trend.side,
      entry: Number(setup.entry.toFixed(6)),
      stop: Number(setup.stop.toFixed(6)),
      tp1: Number(targets.tp1.toFixed(6)),
      tp2: Number(targets.tp2.toFixed(6)),
      riskReward: Number(targets.riskReward.toFixed(2)),
      score: Number(score.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      summary,
      reasons,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      technicalSnapshot,
      marketMetrics,
      rankingPosition: 0,
      penalties,
      bonuses,
    },
  };
}

export function analyzeMarketSymbol(
  input: MarketSymbolInput,
  indicatorCatalog: IndicatorDefinition[] = [],
): SignalCandidate | null {
  return analyzeMarketSymbolDetailed(input, indicatorCatalog).candidate;
}

export function rankSignals(
  inputs: MarketSymbolInput[],
  indicatorCatalog: IndicatorDefinition[] = [],
) {
  const candidates = inputs
    .map((input) => analyzeMarketSymbol(input, indicatorCatalog))
    .filter((candidate): candidate is SignalCandidate => candidate != null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.confidence !== left.confidence) {
        return right.confidence - left.confidence;
      }

      if (right.riskReward !== left.riskReward) {
        return right.riskReward - left.riskReward;
      }

      return left.symbol.localeCompare(right.symbol);
    })
    .map((candidate, index) => ({
      ...candidate,
      rankingPosition: index + 1,
    }));

  const topSignals: SignalSnapshot[] = candidates.slice(0, 5).map(
    ({ rankingPosition: _rankingPosition, penalties: _penalties, bonuses: _bonuses, ...signal }) =>
      signal,
  );

  return {
    candidates: candidates.slice(0, 20),
    topSignals,
  };
}
