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
  | "INVALID_TARGET";

interface SetupResult {
  setup: SetupType;
  baseScore: number;
  entry: number;
  stop: number;
  reasons: string[];
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

function calculateMarketMetrics(
  fundingHistory: FundingSnapshot[] = [],
  openInterestHistory: OpenInterestPoint[] = [],
): MarketMetrics {
  const latestFunding = fundingHistory[fundingHistory.length - 1]?.fundingRate ?? null;
  let openInterestTrendPct: number | null = null;

  if (openInterestHistory.length >= 2) {
    const previous = openInterestHistory[openInterestHistory.length - 2].sumOpenInterestValue;
    const current = openInterestHistory[openInterestHistory.length - 1].sumOpenInterestValue;
    openInterestTrendPct = percentChange(current, previous);
  }

  const squeezeBias =
    latestFunding != null &&
    latestFunding < 0 &&
    openInterestTrendPct != null &&
    openInterestTrendPct > 1
      ? "HIGH_SHORT_SQUEEZE"
      : latestFunding != null &&
          latestFunding > 0 &&
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

  if (
    isNear(dailyClose, dailyEma, 0.008) ||
    isNear(fourHourClose, fourHourEma, 0.008)
  ) {
    return {
      trend: "NEUTRAL",
      side: null,
      notes: ["Fiyat EMA200 çevresinde, filtre gereği elendi."],
    };
  }

  if (dailyClose > dailyEma && fourHourClose > fourHourEma) {
    return {
      trend: "LONG",
      side: "LONG",
      notes: ["1D ve 4H EMA200 üstünde trend uyumu mevcut."],
    };
  }

  if (dailyClose < dailyEma && fourHourClose < fourHourEma) {
    return {
      trend: "SHORT",
      side: "SHORT",
      notes: ["1D ve 4H EMA200 altında trend uyumu mevcut."],
    };
  }

  return {
    trend: "NEUTRAL",
    side: null,
    notes: ["1D ve 4H trend yönü uyumsuz."],
  };
}

function buildTechnicalSnapshot(dailyCandles: Candle[], fourHourCandles: Candle[]) {
  const dailyCloses = closes(dailyCandles);
  const fourHourCloses = closes(fourHourCandles);
  const fourHourBands = bollingerBands(fourHourCloses, 20);

  return {
    dailyClose: last(dailyCloses),
    dailyEma200: last(ema(dailyCloses, 200)),
    fourHourClose: last(fourHourCloses),
    fourHourEma200: last(ema(fourHourCloses, 200)),
    rsi: last(rsi(fourHourCloses, 14)),
    bollingerUpper: last(fourHourBands).upper,
    bollingerMiddle: last(fourHourBands).middle,
    bollingerLower: last(fourHourBands).lower,
    volumeRatio: volumeRatio(fourHourCandles, 20),
    atr: last(atr(fourHourCandles, 14)),
    bbWidth: last(fourHourBands).width,
  };
}

function detectBreakoutRetest(
  side: TradeSide,
  fourHourCandles: Candle[],
  technicalSnapshot: ReturnType<typeof buildTechnicalSnapshot>,
): SetupResult | null {
  const candleHighs = fourHourCandles.map((candle) => candle.high);
  const candleLows = fourHourCandles.map((candle) => candle.low);
  const recentResistance = last(highest(candleHighs.slice(0, -2), 20));
  const recentSupport = last(lowest(candleLows.slice(0, -2), 20));
  const latest = fourHourCandles[fourHourCandles.length - 1];
  const previous = fourHourCandles[fourHourCandles.length - 2];

  if (side === "LONG") {
    const breakout = previous.close > recentResistance;
    const retestHold = latest.low <= recentResistance * 1.005 && latest.close >= recentResistance;
    if (breakout && retestHold && technicalSnapshot.volumeRatio > 1.2) {
      return {
        setup: "BREAKOUT_RETEST",
        baseScore: 33,
        entry: latest.close,
        stop: Math.min(latest.low, recentResistance) - technicalSnapshot.atr * 0.35,
        reasons: [
          "Direnç kırılımı sonrası retest görülüyor.",
          "Retest bölgesinde tutunma mevcut.",
          "Breakout hacim teyidi var.",
        ],
      };
    }
  }

  if (side === "SHORT") {
    const breakdown = previous.close < recentSupport;
    const retestReject =
      latest.high >= recentSupport * 0.995 && latest.close <= recentSupport;
    if (breakdown && retestReject && technicalSnapshot.volumeRatio > 1.2) {
      return {
        setup: "BREAKOUT_RETEST",
        baseScore: 33,
        entry: latest.close,
        stop: Math.max(latest.high, recentSupport) + technicalSnapshot.atr * 0.35,
        reasons: [
          "Destek kaybı sonrası retest reddi mevcut.",
          "Retest bölgesinde satıcı baskısı sürüyor.",
          "Breakdown hacim teyidi var.",
        ],
      };
    }
  }

  return null;
}

function detectSupportBounce(
  side: TradeSide,
  fourHourCandles: Candle[],
  technicalSnapshot: ReturnType<typeof buildTechnicalSnapshot>,
): SetupResult | null {
  const latest = fourHourCandles[fourHourCandles.length - 1];
  const recentSwingLow = Math.min(...fourHourCandles.slice(-12).map((candle) => candle.low));
  const recentSwingHigh = Math.max(...fourHourCandles.slice(-12).map((candle) => candle.high));

  if (
    side === "LONG" &&
    technicalSnapshot.rsi >= 40 &&
    technicalSnapshot.rsi <= 55 &&
    (latest.low <= technicalSnapshot.bollingerLower * 1.01 ||
      latest.close >= technicalSnapshot.bollingerMiddle)
  ) {
    return {
      setup: "SUPPORT_BOUNCE",
      baseScore: 28,
      entry: latest.close,
      stop: recentSwingLow - technicalSnapshot.atr * 0.25,
      reasons: [
        "Bollinger lower band bounce veya middle band support mevcut.",
        "RSI 40-55 bandında toparlanma görülüyor.",
      ],
    };
  }

  if (
    side === "SHORT" &&
    technicalSnapshot.rsi >= 60 &&
    technicalSnapshot.rsi <= 70 &&
    latest.high >= technicalSnapshot.bollingerUpper * 0.99
  ) {
    return {
      setup: "SUPPORT_BOUNCE",
      baseScore: 28,
      entry: latest.close,
      stop: recentSwingHigh + technicalSnapshot.atr * 0.25,
      reasons: [
        "Upper band rejection mevcut.",
        "RSI 60-70 bandında rejection görülüyor.",
      ],
    };
  }

  return null;
}

function detectConsolidationBreakout(
  side: TradeSide,
  fourHourCandles: Candle[],
  technicalSnapshot: ReturnType<typeof buildTechnicalSnapshot>,
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
        "Yatay sıkışma sonrası yukarı breakout.",
        "Dar Bollinger genişlemeye başladı.",
        "Breakout hacim destekli.",
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
        "Yatay sıkışma sonrası aşağı breakout.",
        "Dar Bollinger genişlemeye başladı.",
        "Breakdown hacim destekli.",
      ],
    };
  }

  return null;
}

function detectSetup(
  side: TradeSide,
  fourHourCandles: Candle[],
  technicalSnapshot: ReturnType<typeof buildTechnicalSnapshot>,
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

function evaluateRsiPenalty(side: TradeSide, rsiValue: number) {
  if (rsiValue > 80 || rsiValue < 20) {
    return { allowed: false, notes: ["RSI ekstrem bölgede olduğu için elendi."] };
  }

  if (side === "LONG") {
    const allowed = (rsiValue >= 40 && rsiValue <= 55) || rsiValue >= 50;
    return {
      allowed,
      notes: allowed ? [] : ["LONG için RSI bounce/breakout teyidi yetersiz."],
    };
  }

  const allowed = rsiValue >= 60 && rsiValue <= 70;
  return {
    allowed,
    notes: allowed ? [] : ["SHORT için RSI rejection bölgesi teyit edilmedi."],
  };
}

export function analyzeMarketSymbolDetailed(
  input: MarketSymbolInput,
  indicatorCatalog: IndicatorDefinition[] = [],
): MarketAnalysisResult {
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
  const rsiValidation = evaluateRsiPenalty(trend.side, technicalSnapshot.rsi);
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
  );

  let score = setup.baseScore;
  const reasons = [...trend.notes, ...setup.reasons];
  const penalties: string[] = [];
  const bonuses: string[] = [];

  score += trend.side === "LONG" ? 18 : 17;
  score += Math.min(12, technicalSnapshot.volumeRatio * 4);

  if (marketMetrics.latestFundingRate != null && marketMetrics.latestFundingRate < 0 && trend.side === "LONG") {
    score += 6;
    bonuses.push("Negatif funding long squeeze lehine.");
  }

  if (
    marketMetrics.openInterestTrendPct != null &&
    marketMetrics.openInterestTrendPct > 1 &&
    technicalSnapshot.bbWidth < 0.05
  ) {
    score += 5;
    bonuses.push("Artan open interest sıkışma bonusu verdi.");
  }

  if (technicalSnapshot.volumeRatio < 1.15 && setup.setup !== "SUPPORT_BOUNCE") {
    score -= 8;
    penalties.push("Breakout yapısı için hacim zayıf.");
  }

  if (Math.abs(setup.entry - setup.stop) / setup.entry > 0.06) {
    score -= 6;
    penalties.push("Stop mesafesi geniş.");
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

  const summary =
    trend.side === "LONG"
      ? `${input.symbol} için ${setup.setup} yapısı long yönünde öne çıkıyor. Trend EMA200 üzerinde ve risk/ödül dengesi uygun.`
      : `${input.symbol} için ${setup.setup} yapısı short yönünde öne çıkıyor. Trend EMA200 altında ve risk/ödül dengesi uygun.`;

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
      confidence: Number(Math.min(0.95, 0.55 + score / 200).toFixed(2)),
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
