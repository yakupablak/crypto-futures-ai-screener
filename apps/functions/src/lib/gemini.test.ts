import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("./config", () => ({
  config: {
    ownerId: "local-owner",
    geminiModel: "gemini-2.5-pro",
    geminiFastModel: "gemini-2.5-flash-lite",
    coinGeckoApiKey: undefined,
    geminiApiKey: "test-gemini-key",
  },
}));

vi.stubGlobal("fetch", fetchMock);

import { generateIndicatorProposals, generateTradeReview } from "./gemini";
import type { IndicatorDefinition, TradeJournalEntry } from "@crypto-futures/shared";

function createClosedTrade(id: string): TradeJournalEntry {
  return {
    id,
    ownerId: "local-owner",
    signalId: `signal-${id}`,
    symbol: "BTCUSDT",
    setup: "SUPPORT_BOUNCE",
    side: "LONG",
    leverage: 2,
    entryPrice: 100,
    stopLoss: 95,
    tp1: 108,
    tp2: 112,
    status: "CLOSED",
    openedAt: "2026-03-17T10:00:00.000Z",
    closedAt: "2026-03-17T12:00:00.000Z",
    closePrice: 107,
    realizedRMultiple: 1.4,
    realizedPnlPct: 14,
    notes: "Closed after bounce confirmation",
  };
}

describe("gemini adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a deterministic fallback proposal when there are no closed trades", async () => {
    const proposals = await generateIndicatorProposals([], [], "Need help with breakouts");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      ownerId: "local-owner",
      status: "PENDING",
      summary: expect.stringContaining("genel bir hacim teyit filtresi"),
    });
    expect(proposals[0]?.proposal).toMatchObject({
      ownerId: "local-owner",
      status: "DRAFT",
      builtIn: false,
      name: "Hacim Teyidi Sikilastirici",
    });
  });

  it("normalizes partial Gemini indicator proposals into a valid schema", async () => {
    const trades = [createClosedTrade("trade-1")];
    const indicators: IndicatorDefinition[] = [];

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    {
                      rationale: "Losing trades improved when RSI reclaim was cleaner.",
                      summary: "Add a 4H RSI reclaim confirmation filter.",
                      basedOnTradeIds: ["trade-1"],
                      proposal: {
                        name: "RSI Reclaim Filter",
                        description: "Looks for 4H RSI reclaim above 50.",
                        dsl: JSON.stringify({
                          metadata: {
                            id: "ai-rsi-reclaim",
                            name: "RSI Reclaim Filter",
                            description: "Looks for 4H RSI reclaim above 50.",
                            version: 2,
                          },
                          series: [
                            {
                              id: "rsi_4h",
                              primitive: "RSI",
                              timeframe: "4H",
                              params: {
                                period: 14,
                              },
                            },
                          ],
                          condition: {
                            kind: "comparison",
                            comparator: "GT",
                            left: {
                              source: "series",
                              ref: "rsi_4h",
                            },
                            right: {
                              source: "value",
                              value: 50,
                            },
                          },
                          scoreAdjustment: 5,
                          reasonLabel: "4H RSI reclaim confirmed",
                        }),
                      },
                    },
                  ]),
                },
              ],
            },
          },
        ],
      }),
    });

    const proposals = await generateIndicatorProposals(trades, indicators, "Optimize bounce entries");

    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      ownerId: "local-owner",
      status: "PENDING",
      basedOnTradeIds: ["trade-1"],
    });
    expect(proposals[0]?.proposal).toMatchObject({
      id: "ai-rsi-reclaim",
      ownerId: "local-owner",
      name: "RSI Reclaim Filter",
      status: "DRAFT",
      scoreAdjustment: 5,
      approvedAt: null,
    });
    expect(proposals[0]?.proposal.dsl).toMatchObject({
      metadata: {
        id: "ai-rsi-reclaim",
        version: 2,
      },
      scoreAdjustment: 5,
    });
  });

  it("falls back gracefully when Gemini review output is invalid", async () => {
    const trade = createClosedTrade("trade-review");

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: "Too short and missing required arrays",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    const review = await generateTradeReview(trade);

    expect(review).toMatchObject({
      ownerId: "local-owner",
      tradeId: "trade-review",
      type: "TRADE_REVIEW",
    });
    expect(review.mistakes.length).toBeGreaterThan(0);
    expect(review.improvements.length).toBeGreaterThan(0);
  });

  it("adds Turkish-only instructions to trade review prompts", async () => {
    const trade = createClosedTrade("trade-tr-prompt");

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    id: "review-1",
                    ownerId: "local-owner",
                    tradeId: trade.id,
                    type: "TRADE_REVIEW",
                    summary: "Islem ozeti Turkce yazildi.",
                    mistakes: ["Stop planina sadik kalinmadi."],
                    improvements: ["Giris sonrasi senaryo notu eklenmeli."],
                    proposedIndicatorIds: [],
                    confidence: 0.72,
                    createdAt: "2026-03-17T12:00:00.000Z",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });

    await generateTradeReview(trade);

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const instruction = requestBody.contents?.[0]?.parts?.[0]?.text ?? "";

    expect(instruction).toContain("JSON icindeki tum dogal dil alanlarini yalnizca Turkce yaz.");
    expect(instruction).toContain("Ingilizce cumle veya aciklama yazma.");
  });

  it("adds Turkish-only instructions to indicator proposal prompts", async () => {
    const trades = [createClosedTrade("trade-tr-indicator")];

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    {
                      rationale: "Turkce aciklama",
                      summary: "Turkce ozet",
                      basedOnTradeIds: ["trade-tr-indicator"],
                      proposal: {
                        name: "Turkce Filtre",
                        description: "Turkce aciklama",
                        dsl: {
                          metadata: {
                            id: "turkce-filtre",
                            name: "Turkce Filtre",
                            description: "Turkce aciklama",
                            version: 1,
                          },
                          series: [],
                          condition: {
                            kind: "comparison",
                            comparator: "GT",
                            left: { source: "price", field: "volume", timeframe: "4H" },
                            right: { source: "value", value: 1.2 },
                          },
                          scoreAdjustment: 3,
                          reasonLabel: "Turkce neden",
                        },
                      },
                    },
                  ]),
                },
              ],
            },
          },
        ],
      }),
    });

    await generateIndicatorProposals(trades, [], "Turkce oneriler istiyorum");

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const instruction = requestBody.contents?.[0]?.parts?.[0]?.text ?? "";

    expect(instruction).toContain("JSON icindeki tum dogal dil alanlarini yalnizca Turkce yaz.");
    expect(instruction).toContain("name alanlarinin degerleri Turkce olmali.");
  });
});
