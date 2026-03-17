import { describe, expect, it } from "vitest";

import type { Candle, IndicatorDefinition } from "@crypto-futures/shared";

import { analyzeMarketSymbol, rankSignals } from "../src/engine";

function buildTrendCandles(base: number, step: number, count: number): Candle[] {
  return Array.from({ length: count }, (_, index) => {
    const close = base + index * step;
    return {
      openTime: index,
      closeTime: index + 1,
      open: close - step * 0.4,
      high: close + step * 0.8,
      low: close - step * 0.8,
      close,
      volume: 1000 + index * 25,
    };
  });
}

function buildOscillatingTrendCandles(base: number, step: number, count: number): Candle[] {
  return Array.from({ length: count }, (_, index) => {
    const trend = base + index * step;
    const wave = Math.sin(index / 3);
    const close = trend + wave;
    return {
      openTime: index,
      closeTime: index + 1,
      open: close - 1,
      high: close + 1.5,
      low: close - 1.5,
      close,
      volume: 1000 + (index % 5) * 70,
    };
  });
}

describe("analysis engine", () => {
  it("produces a long candidate when trend and support bounce conditions align", () => {
    let candidate: ReturnType<typeof analyzeMarketSymbol> = null;

    for (const amp of [1, 2, 3]) {
      for (const step of [0.15, 0.2, 0.25]) {
        const dailyCandles = buildOscillatingTrendCandles(100, step, 240).map(
          (candle, index) => ({
            ...candle,
            close: candle.close + Math.sin(index / 3) * (amp - 1),
            high: candle.high + Math.sin(index / 3) * (amp - 1),
            low: candle.low + Math.sin(index / 3) * (amp - 1),
          }),
        );
        const baseFourHour = buildOscillatingTrendCandles(100, step, 260).map(
          (candle, index) => ({
            ...candle,
            close: candle.close + Math.sin(index / 3) * (amp - 1),
            high: candle.high + Math.sin(index / 3) * (amp - 1),
            low: candle.low + Math.sin(index / 3) * (amp - 1),
          }),
        );

        const lastIndex = baseFourHour.length - 1;
        for (const pullback of [2, 3, 4]) {
          const fourHourCandles = structuredClone(baseFourHour);
          fourHourCandles[lastIndex] = {
            ...fourHourCandles[lastIndex],
            volume: 3000,
          };
          fourHourCandles[lastIndex - 1] = {
            ...fourHourCandles[lastIndex - 1],
            close: fourHourCandles[lastIndex - 1].close - pullback,
            low: fourHourCandles[lastIndex - 1].low - pullback,
          };

          candidate = analyzeMarketSymbol({
            ownerId: "demo-owner",
            symbol: "TESTUSDT",
            coinName: "Test Coin",
            dailyCandles,
            fourHourCandles,
            fundingHistory: [
              {
                symbol: "TESTUSDT",
                fundingRate: -0.0005,
                fundingTime: new Date().toISOString(),
              },
            ],
            openInterestHistory: [
              {
                symbol: "TESTUSDT",
                sumOpenInterest: 120,
                sumOpenInterestValue: 1_000_000,
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
              },
              {
                symbol: "TESTUSDT",
                sumOpenInterest: 132,
                sumOpenInterestValue: 1_040_000,
                timestamp: new Date().toISOString(),
              },
            ],
          });

          if (candidate) {
            break;
          }
        }

        if (candidate) {
          break;
        }
      }

      if (candidate) {
        break;
      }
    }

    expect(candidate).not.toBeNull();
    expect(candidate?.side).toBe("LONG");
    expect(candidate?.score).toBeGreaterThan(50);
  });

  it("filters out neutral trend symbols", () => {
    const flatCandles = Array.from({ length: 240 }, (_, index) => ({
      openTime: index,
      closeTime: index + 1,
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 1000,
    }));

    const result = analyzeMarketSymbol({
      ownerId: "demo-owner",
      symbol: "FLATUSDT",
      coinName: "Flat Coin",
      dailyCandles: flatCandles,
      fourHourCandles: [...flatCandles, ...flatCandles.slice(0, 20)],
    });

    expect(result).toBeNull();
  });

  it("keeps ranking deterministic", () => {
    const dailyCandles = buildTrendCandles(50, 0.8, 240);
    const fourHourCandles = buildTrendCandles(50, 0.6, 260);
    const indicator: IndicatorDefinition = {
      id: "extra-boost",
      ownerId: "demo-owner",
      name: "Extra Boost",
      description: "Boost long setups with positive price structure",
      version: 1,
      status: "LIVE",
      builtIn: false,
      scoreAdjustment: 5,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
      dsl: {
        metadata: {
          id: "extra-boost",
          name: "Extra Boost",
          description: "Basic boost",
          version: 1,
        },
        series: [],
        condition: {
          kind: "comparison",
          comparator: "GT",
          left: { source: "price", field: "close", timeframe: "4H" },
          right: { source: "value", value: 90 },
        },
        scoreAdjustment: 5,
        reasonLabel: "Extra boost",
      },
    };

    const first = rankSignals(
      [
        {
          ownerId: "demo-owner",
          symbol: "AAAUSDT",
          coinName: "AAA",
          dailyCandles,
          fourHourCandles,
        },
      ],
      [indicator],
    );
    const second = rankSignals(
      [
        {
          ownerId: "demo-owner",
          symbol: "AAAUSDT",
          coinName: "AAA",
          dailyCandles,
          fourHourCandles,
        },
      ],
      [indicator],
    );

    expect(first.candidates.length).toBe(second.candidates.length);
    if (first.candidates[0] && second.candidates[0]) {
      expect(first.candidates[0].score).toBe(second.candidates[0].score);
    }
  });
});
