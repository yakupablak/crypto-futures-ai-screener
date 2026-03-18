import type { Candle } from "@crypto-futures/shared";

export function last<T>(values: T[]): T {
  return values[values.length - 1];
}

export function closes(candles: Candle[]) {
  return candles.map((candle) => candle.close);
}

export function highs(candles: Candle[]) {
  return candles.map((candle) => candle.high);
}

export function lows(candles: Candle[]) {
  return candles.map((candle) => candle.low);
}

export function volumes(candles: Candle[]) {
  return candles.map((candle) => candle.volume);
}

export function sma(values: number[], period: number) {
  if (values.length < period) {
    return [];
  }

  const result: number[] = [];
  for (let index = period - 1; index < values.length; index += 1) {
    const slice = values.slice(index - period + 1, index + 1);
    result.push(slice.reduce((sum, value) => sum + value, 0) / period);
  }
  return result;
}

export function ema(values: number[], period: number) {
  if (values.length < period) {
    return [];
  }

  const smoothing = 2 / (period + 1);
  const seed = sma(values.slice(0, period), period)[0];
  const result = [seed];

  for (let index = period; index < values.length; index += 1) {
    const next = values[index] * smoothing + result[result.length - 1] * (1 - smoothing);
    result.push(next);
  }

  return result;
}

export function stddev(values: number[], period: number) {
  if (values.length < period) {
    return [];
  }

  const result: number[] = [];
  for (let index = period - 1; index < values.length; index += 1) {
    const slice = values.slice(index - period + 1, index + 1);
    const avg = slice.reduce((sum, value) => sum + value, 0) / period;
    const variance =
      slice.reduce((sum, value) => sum + (value - avg) ** 2, 0) / period;
    result.push(Math.sqrt(variance));
  }
  return result;
}

export function rsi(values: number[], period = 14) {
  if (values.length <= period) {
    return [];
  }

  const gains: number[] = [];
  const losses: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    const delta = values[index] - values[index - 1];
    gains.push(Math.max(delta, 0));
    losses.push(Math.max(-delta, 0));
  }

  let averageGain = gains.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  let averageLoss = losses.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  const result: number[] = [];
  if (averageLoss === 0) {
    result.push(100);
  } else {
    const rs = averageGain / averageLoss;
    result.push(100 - 100 / (1 + rs));
  }

  for (let index = period; index < gains.length; index += 1) {
    averageGain = (averageGain * (period - 1) + gains[index]) / period;
    averageLoss = (averageLoss * (period - 1) + losses[index]) / period;

    if (averageLoss === 0) {
      result.push(100);
      continue;
    }

    const rs = averageGain / averageLoss;
    result.push(100 - 100 / (1 + rs));
  }

  return result;
}

export function bollingerBands(values: number[], period = 20, multiplier = 2) {
  const middle = sma(values, period);
  const deviation = stddev(values, period);

  return middle.map((mid, index) => ({
    middle: mid,
    upper: mid + deviation[index] * multiplier,
    lower: mid - deviation[index] * multiplier,
    width: mid === 0 ? 0 : (deviation[index] * multiplier * 2) / mid,
  }));
}

export function atr(candles: Candle[], period = 14) {
  if (candles.length <= period) {
    return [];
  }

  const trueRanges: number[] = [];
  for (let index = 1; index < candles.length; index += 1) {
    const candle = candles[index];
    const previousClose = candles[index - 1].close;
    trueRanges.push(
      Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - previousClose),
        Math.abs(candle.low - previousClose),
      ),
    );
  }

  const initialAtr = trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  const result = [initialAtr];

  for (let index = period; index < trueRanges.length; index += 1) {
    const nextAtr = (result[result.length - 1] * (period - 1) + trueRanges[index]) / period;
    result.push(nextAtr);
  }

  return result;
}

export function highest(values: number[], period: number) {
  if (values.length < period) {
    return [];
  }

  const result: number[] = [];
  for (let index = period - 1; index < values.length; index += 1) {
    result.push(Math.max(...values.slice(index - period + 1, index + 1)));
  }
  return result;
}

export function lowest(values: number[], period: number) {
  if (values.length < period) {
    return [];
  }

  const result: number[] = [];
  for (let index = period - 1; index < values.length; index += 1) {
    result.push(Math.min(...values.slice(index - period + 1, index + 1)));
  }
  return result;
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return 0;
  }

  return ((current - previous) / previous) * 100;
}

export function volumeRatio(candles: Candle[], period = 20) {
  if (candles.length <= period) {
    return 1;
  }

  const candleVolumes = volumes(candles);
  const latestVolume = last(candleVolumes);
  const baselineSlice = candleVolumes.slice(-(period + 1), -1);
  const baselineAverage = baselineSlice.reduce((sum, value) => sum + value, 0) / baselineSlice.length;

  if (!Number.isFinite(baselineAverage) || baselineAverage === 0) {
    return 1;
  }

  return latestVolume / baselineAverage;
}
