import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
  replaceMarketUniverseMock: vi.fn(),
  fetchTopMarketCapCoinsMock: vi.fn(),
  fetchUsdtPerpetualSymbolsMock: vi.fn(),
}));

vi.mock("@crypto-futures/analysis-core", () => ({
  fetchTopMarketCapCoins: mocks.fetchTopMarketCapCoinsMock,
  fetchUsdtPerpetualSymbols: mocks.fetchUsdtPerpetualSymbolsMock,
}));

vi.mock("../lib/persistence", () => ({
  getSettings: mocks.getSettingsMock,
  replaceMarketUniverse: mocks.replaceMarketUniverseMock,
}));

import { refreshUniverseJob } from "./refresh-universe";

function createBinanceSymbol(index: number) {
  return {
    symbol: `COIN${index}USDT`,
    status: "TRADING",
    contractType: "PERPETUAL",
    quoteAsset: "USDT",
    baseAsset: `COIN${index}`,
  };
}

function createCoin(index: number, prefix = "COIN") {
  return {
    id: `${prefix.toLowerCase()}-${index}`,
    symbol: `${prefix}${index}`,
    name: `${prefix} ${index}`,
    marketCapRank: index + 1,
  };
}

describe("refreshUniverseJob", () => {
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
    mocks.replaceMarketUniverseMock.mockResolvedValue(undefined);
    mocks.fetchUsdtPerpetualSymbolsMock.mockResolvedValue(
      Array.from({ length: 260 }, (_, index) => createBinanceSymbol(index)),
    );
  });

  it("keeps paging until it builds a 200-symbol Binance tradable universe", async () => {
    mocks.fetchTopMarketCapCoinsMock
      .mockResolvedValueOnce([
        ...Array.from({ length: 80 }, (_, index) => createCoin(index)),
        ...Array.from({ length: 170 }, (_, index) => createCoin(index, "MISS")),
      ])
      .mockResolvedValueOnce(Array.from({ length: 220 }, (_, index) => createCoin(index + 80)));

    const result = await refreshUniverseJob();

    expect(mocks.fetchTopMarketCapCoinsMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      count: 200,
      matchedTopCoins: 200,
      whitelistCount: 0,
      pagesFetched: 2,
      globalCoinsFetched: 470,
    });

    const persistedUniverse = mocks.replaceMarketUniverseMock.mock.calls[0]?.[0];
    expect(persistedUniverse).toHaveLength(200);
    expect(new Set(persistedUniverse.map((entry: { symbol: string }) => entry.symbol)).size).toBe(200);
    expect(persistedUniverse[0]).toMatchObject({
      ownerId: "local-owner",
      symbol: "COIN0USDT",
      source: "TOP_200",
      active: true,
    });
  });

  it("adds whitelist symbols and deduplicates overlaps with ranked entries", async () => {
    mocks.getSettingsMock.mockResolvedValue({
      ownerId: "local-owner",
      preferredRiskPerTradePct: 1,
      maxSignals: 5,
      whitelistSymbols: ["BONKUSDT", "COIN1USDT"],
      activeIndicatorIds: [],
      scanIntervalMinutes: 15,
      language: "tr",
    });

    mocks.fetchUsdtPerpetualSymbolsMock.mockResolvedValue([
      createBinanceSymbol(0),
      createBinanceSymbol(1),
      {
        symbol: "BONKUSDT",
        status: "TRADING",
        contractType: "PERPETUAL",
        quoteAsset: "USDT",
        baseAsset: "BONK",
      },
    ]);

    mocks.fetchTopMarketCapCoinsMock
      .mockResolvedValueOnce([
        createCoin(0),
        createCoin(1),
      ])
      .mockResolvedValueOnce([]);

    const result = await refreshUniverseJob();

    expect(result.count).toBe(3);
    expect(result.whitelistCount).toBe(2);

    const persistedUniverse = mocks.replaceMarketUniverseMock.mock.calls[0]?.[0];
    expect(persistedUniverse).toHaveLength(3);
    expect(persistedUniverse).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ symbol: "COIN0USDT", source: "TOP_200" }),
        expect.objectContaining({ symbol: "COIN1USDT" }),
        expect.objectContaining({ symbol: "BONKUSDT", source: "WHITELIST" }),
      ]),
    );
  });
});
