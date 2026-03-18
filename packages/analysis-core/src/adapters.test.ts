import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchKlines, fetchTopMarketCapCoins } from "./adapters";

describe("market adapter logging and sanitization", () => {
  const originalLogLevel = process.env.LOG_LEVEL;
  const originalDateNow = Date.now;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    if (originalLogLevel == null) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
    Date.now = originalDateNow;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not print per-request info logs for successful fast requests at INFO level", async () => {
    process.env.LOG_LEVEL = "INFO";

    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            id: "bitcoin",
            symbol: "btc",
            name: "Bitcoin",
            market_cap_rank: 1,
          },
        ],
      } satisfies Partial<Response>),
    );

    const coins = await fetchTopMarketCapCoins(1, 1);

    expect(coins).toHaveLength(1);
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("does not warn for requests that are only moderately slow at INFO level", async () => {
    process.env.LOG_LEVEL = "INFO";

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      } satisfies Partial<Response>),
    );

    const nowSpy = vi.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(3400);

    await fetchTopMarketCapCoins(1, 1);

    expect(nowSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it("still warns for very slow requests at INFO level", async () => {
    process.env.LOG_LEVEL = "INFO";

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      } satisfies Partial<Response>),
    );

    vi.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(7005);

    await fetchTopMarketCapCoins(1, 1);

    expect(consoleWarnSpy).toHaveBeenCalledOnce();
    expect(consoleWarnSpy.mock.calls[0]?.[0]).toContain("External request completed slowly");
  });

  it("retries transient upstream failures before succeeding", async () => {
    process.env.LOG_LEVEL = "INFO";

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      } satisfies Partial<Response>)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [],
      } satisfies Partial<Response>);

    vi.stubGlobal("fetch", fetchSpy);

    await fetchTopMarketCapCoins(1, 1);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(String(consoleWarnSpy.mock.calls[0]?.[0])).toContain("will retry");
  });

  it("filters open, invalid, duplicate and unsorted klines", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1000);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          [400, "10", "12", "9", "11", "5", 800],
          [100, "1", "2", "0.5", "1.5", "10", 500],
          [100, "1", "2", "0.5", "1.5", "10", 500],
          [700, "4", "5", "3", "4.5", "7", 1500],
          [250, "3", "2", "1", "-1", "2", 600],
        ],
      } satisfies Partial<Response>),
    );

    const candles = await fetchKlines("BTCUSDT", "4h", 5);

    expect(candles).toEqual([
      {
        openTime: 100,
        open: 1,
        high: 2,
        low: 0.5,
        close: 1.5,
        volume: 10,
        closeTime: 500,
      },
      {
        openTime: 400,
        open: 10,
        high: 12,
        low: 9,
        close: 11,
        volume: 5,
        closeTime: 800,
      },
    ]);
  });

  it("surfaces a clear Binance region restriction message for 451 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 451,
        statusText: "Unavailable For Legal Reasons",
      } satisfies Partial<Response>),
    );

    await expect(fetchKlines("BTCUSDT", "1d", 2)).rejects.toThrow(
      "Binance Futures API bu sunucu bolgesinden erisimi yasal nedenlerle engelliyor",
    );
  });
});
