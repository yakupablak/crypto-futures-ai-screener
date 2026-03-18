import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listMarketUniverseMock: vi.fn(),
  listIndicatorsMock: vi.fn(),
  saveWalkForwardSummaryMock: vi.fn(),
  fetchKlinesMock: vi.fn(),
  runWalkForwardBacktestMock: vi.fn(),
}));

vi.mock("../lib/persistence", () => ({
  listMarketUniverse: mocks.listMarketUniverseMock,
  listIndicators: mocks.listIndicatorsMock,
  saveWalkForwardSummary: mocks.saveWalkForwardSummaryMock,
}));

vi.mock("@crypto-futures/analysis-core", () => ({
  fetchKlines: mocks.fetchKlinesMock,
  runWalkForwardBacktest: mocks.runWalkForwardBacktestMock,
}));

import { runWalkForwardJob } from "./run-walk-forward";

function buildCandles(length: number) {
  return Array.from({ length }, (_, index) => ({
    openTime: index * 14_400_000,
    closeTime: index * 14_400_000 + 14_399_000,
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 1000,
  }));
}

describe("runWalkForwardJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listMarketUniverseMock.mockResolvedValue([
      {
        id: "u-1",
        ownerId: "local-owner",
        symbol: "BTCUSDT",
        coinName: "Bitcoin",
        marketCapRank: 1,
        source: "TOP_200",
        active: true,
        updatedAt: "2026-03-18T00:00:00.000Z",
      },
      {
        id: "u-2",
        ownerId: "local-owner",
        symbol: "ETHUSDT",
        coinName: "Ethereum",
        marketCapRank: 2,
        source: "TOP_200",
        active: true,
        updatedAt: "2026-03-18T00:00:00.000Z",
      },
    ]);
    mocks.listIndicatorsMock.mockResolvedValue([]);
    mocks.fetchKlinesMock.mockImplementation(async (_symbol: string, interval: string) =>
      interval === "1d" ? buildCandles(320) : buildCandles(420),
    );
    mocks.runWalkForwardBacktestMock.mockReturnValue({
      ownerId: "local-owner",
      updatedAt: "2026-03-18T00:00:00.000Z",
      symbolsEvaluated: 2,
      barsEvaluated: 300,
      totalSignals: 12,
      trainSignals: 8,
      testSignals: 4,
      trainWinRate: 62.5,
      testWinRate: 50,
      trainExpectancyR: 0.48,
      testExpectancyR: 0.22,
      testAveragePnlPct: 1.13,
      testProfitFactor: 1.41,
      averageBarsHeld: 4.5,
      signalDensityPer100Bars: 4,
      setupBreakdown: [
        {
          setup: "BREAKOUT_RETEST",
          signals: 4,
          winRate: 50,
          expectancyR: 0.22,
        },
      ],
      notes: ["base note"],
    });
  });

  it("fetches historical candles, persists enriched summary, and returns compact metrics", async () => {
    const result = await runWalkForwardJob();

    expect(mocks.fetchKlinesMock).toHaveBeenCalledTimes(4);
    expect(mocks.runWalkForwardBacktestMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ symbol: "BTCUSDT" }),
        expect.objectContaining({ symbol: "ETHUSDT" }),
      ]),
      [],
      { ownerId: "local-owner" },
    );
    expect(mocks.saveWalkForwardSummaryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "local-owner",
        notes: expect.arrayContaining([
          "base note",
          expect.stringContaining("market cap coin"),
          expect.stringContaining("Yeterli history"),
        ]),
      }),
    );
    expect(result).toMatchObject({
      symbolsEvaluated: 2,
      eligibleSymbols: 2,
      totalSignals: 12,
      testSignals: 4,
      testExpectancyR: 0.22,
      signalDensityPer100Bars: 4,
    });
  });

  it("drops markets that do not have enough history", async () => {
    mocks.fetchKlinesMock.mockImplementation(async (symbol: string, interval: string) => {
      if (symbol === "ETHUSDT" && interval === "4h") {
        return buildCandles(200);
      }

      return interval === "1d" ? buildCandles(320) : buildCandles(420);
    });

    await runWalkForwardJob();

    expect(mocks.runWalkForwardBacktestMock).toHaveBeenCalledWith(
      [expect.objectContaining({ symbol: "BTCUSDT" })],
      [],
      { ownerId: "local-owner" },
    );
  });
});
