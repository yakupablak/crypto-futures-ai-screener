import type { IndicatorDefinition, IndicatorProposal } from "./schemas";

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, normalizeValue(item)]),
    );
  }

  return value;
}

function normalizeIndicatorDefinition(definition: IndicatorDefinition) {
  return {
    name: normalizeText(definition.name),
    version: definition.version,
    scoreAdjustment: definition.scoreAdjustment,
    dsl: {
      series: definition.dsl.series
        .map((series) => ({
          primitive: series.primitive,
          timeframe: series.timeframe,
          params: normalizeValue(series.params),
        }))
        .sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right)),
        ),
      condition: normalizeValue(definition.dsl.condition),
      scoreAdjustment: definition.dsl.scoreAdjustment,
      reasonLabel: normalizeText(definition.dsl.reasonLabel),
    },
  };
}

function getCreatedAtWeight(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function pickRepresentativeProposal(
  proposals: IndicatorProposal[],
  hasMatchingIndicator: boolean,
) {
  const sorted = [...proposals].sort(
    (left, right) =>
      getCreatedAtWeight(right.createdAt) - getCreatedAtWeight(left.createdAt),
  );

  if (hasMatchingIndicator) {
    return (
      sorted.find((proposal) => proposal.status === "APPROVED") ??
      sorted.find((proposal) => proposal.status !== "PENDING") ??
      null
    );
  }

  return (
    sorted.find((proposal) => proposal.status === "PENDING") ??
    sorted[0]
  );
}

export function buildIndicatorDefinitionFingerprint(
  definition: IndicatorDefinition,
) {
  return JSON.stringify(normalizeIndicatorDefinition(definition));
}

export function dedupeIndicatorProposals(
  proposals: IndicatorProposal[],
  indicators: IndicatorDefinition[] = [],
) {
  const indicatorFingerprints = new Set(
    indicators.map((indicator) =>
      buildIndicatorDefinitionFingerprint(indicator),
    ),
  );

  const grouped = new Map<string, IndicatorProposal[]>();
  for (const proposal of proposals) {
    const fingerprint = buildIndicatorDefinitionFingerprint(proposal.proposal);
    const current = grouped.get(fingerprint) ?? [];
    current.push(proposal);
    grouped.set(fingerprint, current);
  }

  return [...grouped.entries()]
    .map(([fingerprint, items]) =>
      pickRepresentativeProposal(items, indicatorFingerprints.has(fingerprint)),
    )
    .filter((proposal): proposal is IndicatorProposal => proposal !== null)
    .sort(
      (left, right) =>
        getCreatedAtWeight(right.createdAt) - getCreatedAtWeight(left.createdAt),
    );
}

export function getPendingIndicatorProposals(
  proposals: IndicatorProposal[],
  indicators: IndicatorDefinition[] = [],
) {
  return dedupeIndicatorProposals(proposals, indicators).filter(
    (proposal) => proposal.status === "PENDING",
  );
}
