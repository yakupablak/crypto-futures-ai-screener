import {
  createLogger,
  indicatorDSLDefinitionSchema,
  indicatorDefinitionSchema,
  indicatorProposalSchema,
  tradeReviewReportSchema,
  type IndicatorDefinition,
  type IndicatorProposal,
  type TradeJournalEntry,
  type TradeReviewReport,
} from "@crypto-futures/shared";

import { config } from "./config";

const logger = createLogger("gemini");

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function getString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function getNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getStringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());

  return items.length > 0 ? items : fallback;
}

function getIsoString(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function extractJsonText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Gemini returned empty text");
  }

  const candidates = [trimmed];
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    candidates.unshift(fencedMatch[1].trim());
  }

  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(trimmed.slice(arrayStart, arrayEnd + 1));
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error("Gemini response did not contain valid JSON");
}

function parseMaybeJson(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(extractJsonText(value));
  } catch {
    return value;
  }
}

async function callGeminiJson<T>(
  model: string,
  instruction: string,
  schemaName: string,
): Promise<T> {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY missing");
  }

  const startedAt = Date.now();
  logger.info("Gemini request started", {
    model,
    schemaName,
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.geminiApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: instruction }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed for ${schemaName}: ${response.status}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Gemini returned no text for ${schemaName}`);
  }

  const jsonText = extractJsonText(text);
  logger.info("Gemini request completed", {
    model,
    schemaName,
    durationMs: Date.now() - startedAt,
  });

  return JSON.parse(jsonText) as T;
}

function buildTradeReviewFallback(trade: TradeJournalEntry | null): TradeReviewReport {
  return tradeReviewReportSchema.parse({
    id: `review-${Date.now()}`,
    ownerId: config.ownerId,
    tradeId: trade?.id ?? null,
    type: "TRADE_REVIEW",
    summary:
      "Gemini yaniti gecersiz veya kullanilamadi. Deterministik fallback review uretildi. Daha detayli trade notlari daha iyi AI ciktisi saglar.",
    mistakes: ["Trade kapanis gerekcesini daha net yaz."],
    improvements: ["Entry oncesi beklenti ve invalidation notunu trade journal'a ekle."],
    proposedIndicatorIds: [],
    confidence: 0.58,
    createdAt: new Date().toISOString(),
  });
}

export async function generateTradeReview(
  trade: TradeJournalEntry | null,
): Promise<TradeReviewReport> {
  if (!trade || !config.geminiApiKey) {
    return buildTradeReviewFallback(trade);
  }

  const prompt = `
Sen ust duzey bir crypto futures trading kocusun.
Kullanicinin trade kaydini analiz et ve yalnizca JSON dondur.

Trade:
${JSON.stringify(trade, null, 2)}

Zorunlu alanlar:
- id
- ownerId
- tradeId
- type = "TRADE_REVIEW"
- summary
- mistakes (string[])
- improvements (string[])
- proposedIndicatorIds (string[])
- confidence (0..1)
- createdAt (ISO string)
`;

  try {
    const result = await callGeminiJson<TradeReviewReport>(
      config.geminiModel,
      prompt,
      "tradeReview",
    );

    return tradeReviewReportSchema.parse({
      ...result,
      id: result.id || `review-${Date.now()}`,
      ownerId: config.ownerId,
      tradeId: trade.id,
      type: "TRADE_REVIEW",
      createdAt: result.createdAt || new Date().toISOString(),
    });
  } catch (error) {
    logger.warn("Gemini trade review invalid, fallback review will be used", {
      tradeId: trade.id,
      error,
    });
    return buildTradeReviewFallback(trade);
  }
}

function buildIndicatorProposalFallback(
  trades: TradeJournalEntry[],
): IndicatorProposal[] {
  const now = new Date().toISOString();
  const indicatorId = `dyn-volume-confirm-${Date.now()}`;
  const sampleIndicator: IndicatorDefinition = indicatorDefinitionSchema.parse({
    id: indicatorId,
    ownerId: config.ownerId,
    name: "Volume Confirmation Tightener",
    description:
      "Breakout islemlerinde volume ratio esigini artirarak zayif kirilimlari filtreler.",
    version: 1,
    status: "DRAFT",
    builtIn: false,
    scoreAdjustment: 4,
    createdAt: now,
    approvedAt: null,
    dsl: {
      metadata: {
        id: indicatorId,
        name: "Volume Confirmation Tightener",
        description: "Hacim teyidi guclendirici filtre",
        version: 1,
      },
      series: [],
      condition: {
        kind: "comparison",
        comparator: "GT",
        left: { source: "price", field: "volume", timeframe: "4H" },
        right: { source: "value", value: 1.35 },
      },
      scoreAdjustment: 4,
      reasonLabel: "Guclu hacim onayi",
    },
  });

  return [
    indicatorProposalSchema.parse({
      id: `proposal-${Date.now()}`,
      ownerId: config.ownerId,
      status: "PENDING",
      createdAt: now,
      rationale:
        trades.length > 0
          ? "Fallback analiz, breakout islemlerinde daha yuksek hacim teyidinin yanlis sinyalleri azaltabilecegini dusunuyor."
          : "Kapali trade sayisi henuz yetersiz oldugu icin AI tarafinda genel bir breakout filtre onerisi uretildi.",
      summary:
        trades.length > 0
          ? "Breakout islemlerinde 4H hacim oranini 1.35 ustunde isteyen bir shadow filtre onerildi."
          : "Yeterli realized trade birikene kadar kullanilabilecek genel bir hacim teyit filtresi onerildi.",
      basedOnTradeIds: trades.map((trade) => trade.id),
      proposal: sampleIndicator,
    }),
  ];
}

function buildFallbackIndicatorDefinition(base: {
  id: string;
  name: string;
  description: string;
  version: number;
  scoreAdjustment: number;
  createdAt: string;
}) {
  return indicatorDefinitionSchema.parse({
    id: base.id,
    ownerId: config.ownerId,
    name: base.name,
    description: base.description,
    version: base.version,
    status: "DRAFT",
    builtIn: false,
    scoreAdjustment: base.scoreAdjustment,
    createdAt: base.createdAt,
    approvedAt: null,
    dsl: {
      metadata: {
        id: base.id,
        name: base.name,
        description: base.description,
        version: base.version,
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
        comparator: "LT",
        left: {
          source: "series",
          ref: "rsi_4h",
        },
        right: {
          source: "value",
          value: 45,
        },
      },
      scoreAdjustment: base.scoreAdjustment,
      reasonLabel: `${base.name} active`,
    },
  });
}

function normalizeIndicatorDefinition(
  rawDefinition: unknown,
  index: number,
  summary: string,
  createdAt: string,
) {
  const record = isRecord(rawDefinition) ? rawDefinition : {};
  const rawDsl = parseMaybeJson(record.dsl);
  const dslRecord = isRecord(rawDsl) ? rawDsl : {};
  const dslMetadata = isRecord(dslRecord.metadata) ? dslRecord.metadata : {};

  const name = getString(
    record.name,
    getString(dslMetadata.name, `AI Indicator ${index + 1}`),
  );
  const description = getString(
    record.description,
    getString(dslMetadata.description, summary),
  );
  const version = Math.max(
    1,
    Math.trunc(getNumber(record.version, getNumber(dslMetadata.version, 1))),
  );
  const scoreAdjustment = getNumber(
    record.scoreAdjustment,
    getNumber(dslRecord.scoreAdjustment, 3),
  );
  const id = getString(
    record.id,
    getString(dslMetadata.id, `dyn-${slugify(name) || "indicator"}-${Date.now()}-${index + 1}`),
  );

  const fallback = buildFallbackIndicatorDefinition({
    id,
    name,
    description,
    version,
    scoreAdjustment,
    createdAt,
  });

  const parsedDsl = indicatorDSLDefinitionSchema.safeParse({
    metadata: {
      id,
      name,
      description,
      version,
    },
    series: Array.isArray(dslRecord.series) ? dslRecord.series : fallback.dsl.series,
    condition: dslRecord.condition ?? fallback.dsl.condition,
    scoreAdjustment,
    reasonLabel: getString(dslRecord.reasonLabel, fallback.dsl.reasonLabel),
  });

  if (!parsedDsl.success) {
    logger.warn("Indicator DSL from Gemini was invalid, fallback DSL applied", {
      indicatorId: id,
      errors: parsedDsl.error.flatten(),
    });
  }

  return indicatorDefinitionSchema.parse({
    ...fallback,
    dsl: parsedDsl.success ? parsedDsl.data : fallback.dsl,
  });
}

function normalizeIndicatorProposal(
  rawProposal: unknown,
  trades: TradeJournalEntry[],
  index: number,
) {
  const record = isRecord(rawProposal) ? rawProposal : {};
  const createdAt = getIsoString(record.createdAt, new Date().toISOString());
  const summary = getString(
    record.summary,
    `AI tarafindan hazirlanan indicator onerisi #${index + 1}`,
  );
  const rationale = getString(
    record.rationale,
    "Trade gecmisi ve piyasa akisina gore yeni bir filtre onerildi.",
  );
  const proposalId = getString(record.id, `proposal-${Date.now()}-${index + 1}`);
  const basedOnTradeIds = getStringArray(record.basedOnTradeIds, trades.map((trade) => trade.id));

  return indicatorProposalSchema.parse({
    id: proposalId,
    ownerId: config.ownerId,
    status: "PENDING",
    createdAt,
    rationale,
    summary,
    basedOnTradeIds,
    proposal: normalizeIndicatorDefinition(record.proposal, index, summary, createdAt),
  });
}

export async function generateIndicatorProposals(
  trades: TradeJournalEntry[],
  indicators: IndicatorDefinition[],
  context?: string,
): Promise<IndicatorProposal[]> {
  if (!config.geminiApiKey || trades.length === 0) {
    if (trades.length === 0) {
      logger.warn("No closed trades available for AI indicator suggestion, fallback will be used");
    }
    return buildIndicatorProposalFallback(trades);
  }

  const prompt = `
Sen deneyimli bir crypto futures trader ve guvenli sistem tasarimcisisin.
Kullanicinin realize islemlerine gore yeni indicator/filter onerileri uret.
Yalnizca JSON array dondur.
Oneriler guvenli DSL kullanmali, keyfi kod uretmemeli.

Mevcut indicators:
${JSON.stringify(indicators, null, 2)}

Realized trades:
${JSON.stringify(trades, null, 2)}

User context:
${context ? context : "No extra user context provided."}

Her proposal icin alanlar:
- id
- ownerId
- status = "PENDING"
- createdAt
- rationale
- summary
- basedOnTradeIds
- proposal (IndicatorDefinition semasina uygun)
`;

  try {
    const result = await callGeminiJson<unknown>(
      config.geminiModel,
      prompt,
      "indicatorProposals",
    );
    const proposals = Array.isArray(result) ? result : [result];
    return proposals.map((proposal, index) =>
      normalizeIndicatorProposal(proposal, trades, index),
    );
  } catch (error) {
    logger.warn("Gemini indicator proposals invalid, fallback proposals will be used", {
      tradeCount: trades.length,
      indicatorCount: indicators.length,
      error,
    });
    return buildIndicatorProposalFallback(trades);
  }
}
