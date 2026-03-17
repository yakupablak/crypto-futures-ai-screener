import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchTopMarketCapCoins } from "./adapters";

describe("market adapter logging", () => {
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    if (originalLogLevel == null) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
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
});
