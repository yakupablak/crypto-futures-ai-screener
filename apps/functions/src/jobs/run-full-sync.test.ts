import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setMock: vi.fn(),
  getSettingsMock: vi.fn(),
  refreshUniverseJobMock: vi.fn(),
  runMarketScanJobMock: vi.fn(),
  evaluateShadowIndicatorsJobMock: vi.fn(),
  aggregatePerformanceJobMock: vi.fn(),
}));

vi.mock("../lib/admin", () => ({
  getDb: () => ({
    collection: () => ({
      doc: () => ({
        set: mocks.setMock,
      }),
    }),
  }),
}));

vi.mock("../lib/persistence", () => ({
  getSettings: mocks.getSettingsMock,
}));

vi.mock("./refresh-universe", () => ({
  refreshUniverseJob: mocks.refreshUniverseJobMock,
}));

vi.mock("./run-market-scan", () => ({
  runMarketScanJob: mocks.runMarketScanJobMock,
}));

vi.mock("./evaluate-shadow-indicators", () => ({
  evaluateShadowIndicatorsJob: mocks.evaluateShadowIndicatorsJobMock,
}));

vi.mock("./aggregate-performance", () => ({
  aggregatePerformanceJob: mocks.aggregatePerformanceJobMock,
}));

import { runFullSync } from "./run-full-sync";

describe("runFullSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSettingsMock.mockResolvedValue({
      ownerId: "local-owner",
      preferredRiskPerTradePct: 1,
      maxSignals: 5,
      whitelistSymbols: [],
      activeIndicatorIds: [],
      scanIntervalMinutes: 15,
      language: "tr",
    });
    mocks.refreshUniverseJobMock.mockResolvedValue({ count: 113 });
    mocks.runMarketScanJobMock.mockResolvedValue({ signalCount: 3, candidateCount: 14 });
    mocks.evaluateShadowIndicatorsJobMock.mockResolvedValue({ shadowIndicatorCount: 2 });
    mocks.aggregatePerformanceJobMock.mockResolvedValue({ totalClosedTrades: 7 });
  });

  it("runs all jobs by default and persists running + idle states", async () => {
    const result = await runFullSync();

    expect(mocks.refreshUniverseJobMock).toHaveBeenCalledTimes(1);
    expect(mocks.runMarketScanJobMock).toHaveBeenCalledTimes(1);
    expect(mocks.evaluateShadowIndicatorsJobMock).toHaveBeenCalledTimes(1);
    expect(mocks.aggregatePerformanceJobMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ownerId: "local-owner",
      universe: { count: 113 },
      scan: { signalCount: 3, candidateCount: 14 },
      shadow: { shadowIndicatorCount: 2 },
      performance: { totalClosedTrades: 7 },
    });
    expect(mocks.setMock).toHaveBeenCalledTimes(2);
    expect(mocks.setMock.mock.calls[0]?.[0]).toMatchObject({
      ownerId: "local-owner",
      status: "RUNNING",
    });
    expect(mocks.setMock.mock.calls[1]?.[0]).toMatchObject({
      ownerId: "local-owner",
      status: "IDLE",
      lastResult: result,
    });
  });

  it("respects disabled job options", async () => {
    const result = await runFullSync({
      includeUniverse: false,
      includeShadow: false,
      includePerformance: false,
    });

    expect(mocks.refreshUniverseJobMock).not.toHaveBeenCalled();
    expect(mocks.evaluateShadowIndicatorsJobMock).not.toHaveBeenCalled();
    expect(mocks.aggregatePerformanceJobMock).not.toHaveBeenCalled();
    expect(mocks.runMarketScanJobMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ownerId: "local-owner",
      scan: { signalCount: 3, candidateCount: 14 },
    });
  });

  it("writes error state when a job fails", async () => {
    mocks.runMarketScanJobMock.mockRejectedValue(new Error("scan failed"));

    await expect(runFullSync()).rejects.toThrow("scan failed");
    expect(mocks.setMock).toHaveBeenCalledTimes(2);
    expect(mocks.setMock.mock.calls[1]?.[0]).toMatchObject({
      ownerId: "local-owner",
      status: "ERROR",
      errorMessage: "scan failed",
    });
  });
});
