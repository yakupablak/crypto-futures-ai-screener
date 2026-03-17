import { describe, expect, it } from "vitest";

import {
  buildIndicatorDefinitionFingerprint,
  dedupeIndicatorProposals,
} from "@crypto-futures/shared";
import type { IndicatorDefinition, IndicatorProposal } from "@crypto-futures/shared";

function createIndicator(overrides: Partial<IndicatorDefinition> = {}): IndicatorDefinition {
  return {
    id: overrides.id ?? "indicator-1",
    ownerId: overrides.ownerId ?? "local-owner",
    name: overrides.name ?? "Volume Confirmation Tightener",
    description:
      overrides.description ?? "Tightens volume confirmation for breakout setups.",
    version: overrides.version ?? 1,
    status: overrides.status ?? "DRAFT",
    builtIn: overrides.builtIn ?? false,
    scoreAdjustment: overrides.scoreAdjustment ?? 4,
    createdAt: overrides.createdAt ?? "2026-03-18T00:00:00.000Z",
    approvedAt: overrides.approvedAt ?? null,
    dsl: overrides.dsl ?? {
      metadata: {
        id: overrides.id ?? "indicator-1",
        name: overrides.name ?? "Volume Confirmation Tightener",
        description:
          overrides.description ?? "Tightens volume confirmation for breakout setups.",
        version: overrides.version ?? 1,
      },
      series: [],
      condition: {
        kind: "comparison",
        comparator: "GT",
        left: { source: "price", field: "volume", timeframe: "4H" },
        right: { source: "value", value: 1.35 },
      },
      scoreAdjustment: overrides.scoreAdjustment ?? 4,
      reasonLabel: "Strong volume confirmation",
    },
  };
}

function createProposal(
  id: string,
  createdAt: string,
  status: IndicatorProposal["status"],
  proposal: IndicatorDefinition,
): IndicatorProposal {
  return {
    id,
    ownerId: "local-owner",
    status,
    createdAt,
    rationale: "AI thinks this filter is useful.",
    summary: "Use stronger volume confirmation.",
    basedOnTradeIds: [],
    proposal,
  };
}

describe("indicator proposal dedupe helpers", () => {
  it("treats same indicator logic as identical even when ids differ", () => {
    const left = createIndicator({ id: "indicator-left", createdAt: "2026-03-18T00:00:00.000Z" });
    const right = createIndicator({ id: "indicator-right", createdAt: "2026-03-18T01:00:00.000Z" });

    expect(buildIndicatorDefinitionFingerprint(left)).toBe(
      buildIndicatorDefinitionFingerprint(right),
    );
  });

  it("keeps only the latest pending duplicate when indicator is not yet active", () => {
    const indicator = createIndicator();
    const items = dedupeIndicatorProposals([
      createProposal("proposal-old", "2026-03-18T00:00:00.000Z", "PENDING", indicator),
      createProposal("proposal-new", "2026-03-18T01:00:00.000Z", "PENDING", {
        ...indicator,
        id: "indicator-new",
      }),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("proposal-new");
    expect(items[0]?.status).toBe("PENDING");
  });

  it("prefers the approved duplicate when the indicator already exists in catalog", () => {
    const indicator = createIndicator({ id: "indicator-approved", status: "SHADOW" });
    const pendingDuplicate = createProposal(
      "proposal-pending",
      "2026-03-18T02:00:00.000Z",
      "PENDING",
      createIndicator({ id: "indicator-pending" }),
    );
    const approvedDuplicate = createProposal(
      "proposal-approved",
      "2026-03-18T01:00:00.000Z",
      "APPROVED",
      createIndicator({ id: "indicator-approved-historical" }),
    );

    const items = dedupeIndicatorProposals(
      [pendingDuplicate, approvedDuplicate],
      [indicator],
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("proposal-approved");
    expect(items[0]?.status).toBe("APPROVED");
  });

  it("hides stale pending duplicates when the same indicator is already active", () => {
    const indicator = createIndicator({ id: "indicator-live", status: "LIVE" });
    const items = dedupeIndicatorProposals(
      [
        createProposal(
          "proposal-pending",
          "2026-03-18T03:00:00.000Z",
          "PENDING",
          createIndicator({ id: "indicator-duplicate" }),
        ),
      ],
      [indicator],
    );

    expect(items).toHaveLength(0);
  });
});
