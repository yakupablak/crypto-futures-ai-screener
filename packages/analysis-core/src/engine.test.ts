import { describe, expect, it } from "vitest";

import type { Candle } from "@crypto-futures/shared";

import { analyzeMarketSymbolDetailed } from "./engine";

function candlesFromCloses(closes: number[], volume = 10): Candle[] {
  return closes.map((close, index) => ({
    openTime: index * 1000,
    closeTime: index * 1000 + 500,
    open: close - 0.4,
    high: close + 1,
    low: close - 1,
    close,
    volume,
  }));
}

describe("market analysis engine", () => {
  it("rejects symbols with insufficient candle history before producing a setup", () => {
    const result = analyzeMarketSymbolDetailed({
      ownerId: "local-owner",
      symbol: "TESTUSDT",
      coinName: "Test",
      dailyCandles: candlesFromCloses(Array.from({ length: 50 }, (_, index) => 100 + index)),
      fourHourCandles: candlesFromCloses(
        Array.from({ length: 50 }, (_, index) => 100 + index * 0.5),
      ),
    });

    expect(result.candidate).toBeNull();
    expect(result.rejectionReason).toBe("INSUFFICIENT_DATA");
  });

  it("rejects long setups when RSI is simply elevated instead of bouncing or freshly crossing 50", () => {
    const dailyCandles = candlesFromCloses(
      Array.from({ length: 260 }, (_, index) => 100 + index * 0.3),
    );
    const fourHourCandles = candlesFromCloses(
      Array.from({ length: 260 }, (_, index) => 100 + index * 0.05 + Math.sin(index / 2) * 2.4),
    );

    const result = analyzeMarketSymbolDetailed({
      ownerId: "local-owner",
      symbol: "TESTUSDT",
      coinName: "Test",
      dailyCandles,
      fourHourCandles,
    });

    expect(result.candidate).toBeNull();
    expect(result.rejectionReason).toBe("RSI_FILTER");
  });
});
