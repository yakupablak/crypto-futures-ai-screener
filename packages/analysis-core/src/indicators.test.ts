import { describe, expect, it } from "vitest";

import type { Candle } from "@crypto-futures/shared";

import { atr, rsi, volumeRatio } from "./indicators";

function createCandle(index: number, close: number, volume = 10): Candle {
  return {
    openTime: index * 1000,
    closeTime: index * 1000 + 500,
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume,
  };
}

describe("indicator calculations", () => {
  it("produces the first RSI value as soon as the minimum history is available", () => {
    const values = Array.from({ length: 15 }, (_, index) => index + 1);

    const result = rsi(values, 14);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(100);
  });

  it("uses Wilder smoothing for ATR after the seed value", () => {
    const candles = [
      createCandle(0, 10),
      createCandle(1, 11),
      createCandle(2, 12),
      createCandle(3, 13),
      createCandle(4, 14),
    ];

    const result = atr(candles, 3);

    expect(result).toHaveLength(2);
    expect(result[0]).toBeCloseTo(2, 6);
    expect(result[1]).toBeCloseTo(2, 6);
  });

  it("computes volume ratio against the previous baseline candles instead of including the latest bar", () => {
    const candles = Array.from({ length: 21 }, (_, index) =>
      createCandle(index, 100 + index, index === 20 ? 30 : 10),
    );

    const ratio = volumeRatio(candles, 20);

    expect(ratio).toBeCloseTo(3, 6);
  });
});
