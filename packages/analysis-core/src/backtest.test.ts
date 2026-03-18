import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analyzeMock: vi.fn(),
}));

vi.mock("./engine", () => ({
  analyzeMarketSymbolDetailed: mocks.analyzeMock,
}));

import { runWalkForwardBacktest } from "./backtest";

function buildCandles(length: number, override: Record<number, Partial<{ high: number; low: number; close: number }>> = {}) {
  return Array.from({ length }, (_, index) => {
    const base = 100 + index * 0.1;
    const custom = override[index] ?? {};

    return {
      openTime: index * 14_400_000,
      closeTime: index * 14_400_000 + 14_399_000,
      open: base,
      high: custom.high ?? base + 1,
      low: custom.low ?? base - 1,
      close: custom.close ?? base + 0.25,
      volume: 1000 + index,
    };
  });
}

function buildDailyCandles(length: number) {
  return Array.from({ length }, (_, index) => {
    const base = 100 + index;
    return {
      openTime: index * 86_400_000,
      closeTime: index * 86_400_000 + 86_399_000,
      open: base,
      high: base + 2,
      low: base - 2,
      close: base + 1,
      volume: 10_000 + index,
    };
  });
}

describe("runWalkForwardBacktest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("splits train and test signals and reports out-of-sample setup stats", () => {
    mocks.analyzeMock.mockImplementation((input: { fourHourCandles: Array<unknown> }) => {
      if (input.fourHourCandles.length === 220) {
        return {
          candidate: {
            side: "LONG",
            setup: "BREAKOUT_RETEST",
            entry: 100,
            stop: 90,
            tp1: 110,
            tp2: 120,
          },
        };
      }

      if (input.fourHourCandles.length === 221) {
        return {
          candidate: {
            side: "SHORT",
            setup: "SUPPORT_BOUNCE",
            entry: 100,
            stop: 110,
            tp1: 90,
            tp2: 80,
          },
        };
      }

      return { candidate: null };
    });

    const summary = runWalkForwardBacktest(
      [
        {
          symbol: "BTCUSDT",
          coinName: "Bitcoin",
          dailyCandles: buildDailyCandles(260),
          fourHourCandles: buildCandles(222, {
            220: { high: 111, low: 99, close: 108 },
            221: { high: 111, low: 95, close: 109 },
          }),
        },
      ],
      [],
      { ownerId: "test-owner" },
    );

    expect(summary.ownerId).toBe("test-owner");
    expect(summary.totalSignals).toBe(2);
    expect(summary.trainSignals).toBe(1);
    expect(summary.testSignals).toBe(1);
    expect(summary.trainExpectancyR).toBe(1);
    expect(summary.testExpectancyR).toBe(-1);
    expect(summary.testWinRate).toBe(0);
    expect(summary.setupBreakdown).toEqual([
      {
        setup: "SUPPORT_BOUNCE",
        signals: 1,
        winRate: 0,
        expectancyR: -1,
      },
    ]);
  });

  it("returns zeroed summary when no signal is produced", () => {
    mocks.analyzeMock.mockReturnValue({ candidate: null });

    const summary = runWalkForwardBacktest(
      [
        {
          symbol: "ETHUSDT",
          coinName: "Ethereum",
          dailyCandles: buildDailyCandles(260),
          fourHourCandles: buildCandles(225),
        },
      ],
      [],
    );

    expect(summary.totalSignals).toBe(0);
    expect(summary.testSignals).toBe(0);
    expect(summary.testExpectancyR).toBe(0);
    expect(summary.signalDensityPer100Bars).toBe(0);
    expect(summary.setupBreakdown).toEqual([]);
  });
});
