import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listClosedTradesMock: vi.fn(),
  savePerformanceSnapshotMock: vi.fn(),
}));

vi.mock("../lib/persistence", () => ({
  listClosedTrades: mocks.listClosedTradesMock,
  savePerformanceSnapshot: mocks.savePerformanceSnapshotMock,
}));

import { aggregatePerformanceJob } from "./aggregate-performance";

describe("aggregatePerformanceJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listClosedTradesMock.mockResolvedValue([
      {
        id: "t1",
        ownerId: "local-owner",
        signalId: "s1",
        symbol: "BTCUSDT",
        setup: "BREAKOUT_RETEST",
        side: "LONG",
        leverage: 2,
        entryPrice: 100,
        stopLoss: 95,
        tp1: 108,
        tp2: 112,
        status: "CLOSED",
        openedAt: "2026-03-17T10:00:00.000Z",
        closedAt: "2026-03-17T11:00:00.000Z",
        closePrice: 110,
        realizedRMultiple: 2,
        realizedPnlPct: 10,
        notes: "",
      },
      {
        id: "t2",
        ownerId: "local-owner",
        signalId: "s2",
        symbol: "ETHUSDT",
        setup: "BREAKOUT_RETEST",
        side: "SHORT",
        leverage: 2,
        entryPrice: 200,
        stopLoss: 210,
        tp1: 188,
        tp2: 180,
        status: "CLOSED",
        openedAt: "2026-03-17T12:00:00.000Z",
        closedAt: "2026-03-17T14:00:00.000Z",
        closePrice: 206,
        realizedRMultiple: -0.6,
        realizedPnlPct: -4,
        notes: "",
      },
    ]);
  });

  it("persists richer statistical performance metrics", async () => {
    const result = await aggregatePerformanceJob();

    expect(result).toMatchObject({
      totalClosedTrades: 2,
      expectancyR: 0.7,
      profitFactor: 2.5,
    });

    expect(mocks.savePerformanceSnapshotMock).toHaveBeenCalledOnce();
    expect(mocks.savePerformanceSnapshotMock.mock.calls[0]?.[0]).toMatchObject({
      totalClosedTrades: 2,
      overallWinRate: 50,
      averageHoldMinutes: 90,
      medianHoldMinutes: 90,
      expectancyR: 0.7,
      profitFactor: 2.5,
      sideStats: expect.any(Array),
      setupStats: expect.any(Array),
    });
  });
});
