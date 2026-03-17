import type {
  Candle,
  Comparator,
  ConditionOperand,
  ConditionTree,
  IndicatorDefinition,
  IndicatorSeriesDefinition,
  MarketMetrics,
  TimeFrame,
} from "@crypto-futures/shared";
import { indicatorDSLDefinitionSchema } from "@crypto-futures/shared";

import {
  atr,
  bollingerBands,
  closes,
  ema,
  highest,
  lowest,
  percentChange,
  rsi,
  sma,
  stddev,
  volumeRatio,
} from "./indicators";

export interface IndicatorEvaluationContext {
  candlesByTimeframe: Record<TimeFrame, Candle[]>;
  marketMetrics: MarketMetrics;
}

interface ResolvedValue {
  current: number;
  previous: number | null;
}

function getSeriesValues(
  definition: IndicatorSeriesDefinition,
  candlesByTimeframe: Record<TimeFrame, Candle[]>,
  marketMetrics: MarketMetrics,
): number[] {
  const candles = candlesByTimeframe[definition.timeframe];
  const closeValues = closes(candles);
  const period = Number(definition.params.period ?? 14);

  switch (definition.primitive) {
    case "EMA":
      return ema(closeValues, period);
    case "SMA":
      return sma(closeValues, period);
    case "RSI":
      return rsi(closeValues, period);
    case "BOLLINGER_UPPER":
      return bollingerBands(closeValues, period).map((band) => band.upper);
    case "BOLLINGER_MIDDLE":
      return bollingerBands(closeValues, period).map((band) => band.middle);
    case "BOLLINGER_LOWER":
      return bollingerBands(closeValues, period).map((band) => band.lower);
    case "ATR":
      return atr(candles, period);
    case "VOLUME_SMA":
      return sma(candles.map((candle) => candle.volume), period);
    case "HIGHEST":
      return highest(closeValues, period);
    case "LOWEST":
      return lowest(closeValues, period);
    case "CHANGE":
      return closeValues.slice(1).map((value, index) => percentChange(value, closeValues[index]));
    case "STDDEV":
      return stddev(closeValues, period);
    case "OI_DELTA":
      return [marketMetrics.openInterestTrendPct ?? 0, marketMetrics.openInterestTrendPct ?? 0];
    case "FUNDING_TREND":
      return [marketMetrics.latestFundingRate ?? 0, marketMetrics.latestFundingRate ?? 0];
    case "ADX":
    case "MACD":
    case "STOCHASTIC":
    case "OBV":
      return sma(closeValues, Math.max(period, 5));
    default:
      return [];
  }
}

function resolveOperand(
  operand: ConditionOperand,
  seriesValues: Map<string, number[]>,
  context: IndicatorEvaluationContext,
): ResolvedValue {
  if (operand.source === "series") {
    const values = seriesValues.get(operand.ref) ?? [];
    return {
      current: values.length > 0 ? values[values.length - 1] : 0,
      previous: values.length > 1 ? values[values.length - 2] : null,
    };
  }

  if (operand.source === "value") {
    return { current: operand.value, previous: operand.value };
  }

  if (operand.source === "funding") {
    const value = context.marketMetrics.latestFundingRate ?? 0;
    return { current: value, previous: value };
  }

  if (operand.source === "openInterest") {
    const value = context.marketMetrics.openInterestTrendPct ?? 0;
    return { current: value, previous: value };
  }

  const candles = context.candlesByTimeframe[operand.timeframe];
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];

  if (operand.field === "volume") {
    const ratio = volumeRatio(candles);
    return { current: ratio, previous: ratio };
  }

  return {
    current: latest?.[operand.field] ?? 0,
    previous: previous?.[operand.field] ?? null,
  };
}

function compareValues(
  comparator: Comparator,
  left: ResolvedValue,
  right: ResolvedValue | { lower: ResolvedValue; upper: ResolvedValue },
) {
  switch (comparator) {
    case "GT":
      return left.current > (right as ResolvedValue).current;
    case "GTE":
      return left.current >= (right as ResolvedValue).current;
    case "LT":
      return left.current < (right as ResolvedValue).current;
    case "LTE":
      return left.current <= (right as ResolvedValue).current;
    case "BETWEEN":
      return (
        left.current >= (right as { lower: ResolvedValue; upper: ResolvedValue }).lower.current &&
        left.current <= (right as { lower: ResolvedValue; upper: ResolvedValue }).upper.current
      );
    case "CROSSES_ABOVE":
      return (
        left.previous != null &&
        (right as ResolvedValue).previous != null &&
        left.previous <= (right as ResolvedValue).previous! &&
        left.current > (right as ResolvedValue).current
      );
    case "CROSSES_BELOW":
      return (
        left.previous != null &&
        (right as ResolvedValue).previous != null &&
        left.previous >= (right as ResolvedValue).previous! &&
        left.current < (right as ResolvedValue).current
      );
  }
}

function evaluateConditionNode(
  node: ConditionTree,
  seriesValues: Map<string, number[]>,
  context: IndicatorEvaluationContext,
): boolean {
  if (node.kind === "logic") {
    if (node.operator === "AND") {
      return node.nodes.every((child) =>
        evaluateConditionNode(child, seriesValues, context),
      );
    }

    return node.nodes.some((child) =>
      evaluateConditionNode(child, seriesValues, context),
    );
  }

  const left = resolveOperand(node.left, seriesValues, context);
  const right =
    "lower" in node.right
      ? {
          lower: resolveOperand(node.right.lower, seriesValues, context),
          upper: resolveOperand(node.right.upper, seriesValues, context),
        }
      : resolveOperand(node.right, seriesValues, context);

  return compareValues(node.comparator, left, right);
}

export interface IndicatorHit {
  indicatorId: string;
  scoreAdjustment: number;
  reason: string;
  status: IndicatorDefinition["status"];
}

export function evaluateIndicatorDefinition(
  indicator: IndicatorDefinition,
  context: IndicatorEvaluationContext,
): IndicatorHit | null {
  const parsed = indicatorDSLDefinitionSchema.safeParse(indicator.dsl);
  if (!parsed.success) {
    return null;
  }

  const seriesValues = new Map<string, number[]>();
  for (const series of parsed.data.series) {
    seriesValues.set(
      series.id,
      getSeriesValues(series, context.candlesByTimeframe, context.marketMetrics),
    );
  }

  const isMatched = evaluateConditionNode(parsed.data.condition, seriesValues, context);
  if (!isMatched) {
    return null;
  }

  return {
    indicatorId: indicator.id,
    scoreAdjustment: parsed.data.scoreAdjustment,
    reason: parsed.data.reasonLabel,
    status: indicator.status,
  };
}
