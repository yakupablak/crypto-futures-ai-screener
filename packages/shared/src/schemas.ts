import { z } from "zod";

export const timeFrameSchema = z.enum(["1D", "4H", "1H", "15M"]);
export type TimeFrame = z.infer<typeof timeFrameSchema>;

export const tradeSideSchema = z.enum(["LONG", "SHORT"]);
export type TradeSide = z.infer<typeof tradeSideSchema>;

export const trendDirectionSchema = z.enum(["LONG", "SHORT", "NEUTRAL"]);
export type TrendDirection = z.infer<typeof trendDirectionSchema>;

export const setupTypeSchema = z.enum([
  "BREAKOUT_RETEST",
  "SUPPORT_BOUNCE",
  "CONSOLIDATION_BREAKOUT",
]);
export type SetupType = z.infer<typeof setupTypeSchema>;

export const tradeStatusSchema = z.enum(["OPEN", "CLOSED"]);
export type TradeStatus = z.infer<typeof tradeStatusSchema>;

export const indicatorLifecycleSchema = z.enum([
  "DRAFT",
  "VALIDATED",
  "SHADOW",
  "LIVE",
  "DISABLED",
]);
export type IndicatorLifecycle = z.infer<typeof indicatorLifecycleSchema>;

export const aiReviewTypeSchema = z.enum([
  "TRADE_REVIEW",
  "MISTAKE_MINING",
  "INDICATOR_PROPOSAL",
  "FILTER_TUNING",
]);
export type AIReviewType = z.infer<typeof aiReviewTypeSchema>;

export const candleSchema = z.object({
  openTime: z.number(),
  closeTime: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
});
export type Candle = z.infer<typeof candleSchema>;

export const fundingSnapshotSchema = z.object({
  symbol: z.string(),
  fundingRate: z.number(),
  fundingTime: z.string(),
  markPrice: z.number().optional(),
});
export type FundingSnapshot = z.infer<typeof fundingSnapshotSchema>;

export const openInterestPointSchema = z.object({
  symbol: z.string(),
  sumOpenInterest: z.number(),
  sumOpenInterestValue: z.number(),
  timestamp: z.string(),
});
export type OpenInterestPoint = z.infer<typeof openInterestPointSchema>;

export const technicalSnapshotSchema = z.object({
  dailyClose: z.number(),
  dailyEma200: z.number(),
  fourHourClose: z.number(),
  fourHourEma200: z.number(),
  rsi: z.number(),
  bollingerUpper: z.number(),
  bollingerMiddle: z.number(),
  bollingerLower: z.number(),
  volumeRatio: z.number(),
  atr: z.number(),
  bbWidth: z.number(),
});
export type TechnicalSnapshot = z.infer<typeof technicalSnapshotSchema>;

export const marketMetricsSchema = z.object({
  latestFundingRate: z.number().nullable(),
  openInterestTrendPct: z.number().nullable(),
  squeezeBias: z.enum(["HIGH_SHORT_SQUEEZE", "HIGH_LONG_SQUEEZE", "NEUTRAL"]),
});
export type MarketMetrics = z.infer<typeof marketMetricsSchema>;

export const signalSnapshotSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  symbol: z.string(),
  coinName: z.string(),
  trend: trendDirectionSchema,
  setup: setupTypeSchema,
  side: tradeSideSchema,
  entry: z.number(),
  stop: z.number(),
  tp1: z.number(),
  tp2: z.number(),
  riskReward: z.number(),
  score: z.number(),
  confidence: z.number(),
  summary: z.string(),
  reasons: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  technicalSnapshot: technicalSnapshotSchema,
  marketMetrics: marketMetricsSchema,
});
export type SignalSnapshot = z.infer<typeof signalSnapshotSchema>;

export const signalCandidateSchema = signalSnapshotSchema.extend({
  rankingPosition: z.number(),
  penalties: z.array(z.string()),
  bonuses: z.array(z.string()),
});
export type SignalCandidate = z.infer<typeof signalCandidateSchema>;

export const tradeJournalEntrySchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  signalId: z.string(),
  symbol: z.string(),
  setup: setupTypeSchema,
  side: tradeSideSchema,
  leverage: z.number().default(2),
  entryPrice: z.number(),
  stopLoss: z.number(),
  tp1: z.number(),
  tp2: z.number(),
  status: tradeStatusSchema,
  openedAt: z.string(),
  closedAt: z.string().nullable(),
  closePrice: z.number().nullable(),
  realizedRMultiple: z.number().nullable(),
  realizedPnlPct: z.number().nullable(),
  notes: z.string().default(""),
});
export type TradeJournalEntry = z.infer<typeof tradeJournalEntrySchema>;

export const createTradePayloadSchema = z.object({
  signalId: z.string(),
  notes: z.string().optional(),
});
export type CreateTradePayload = z.infer<typeof createTradePayloadSchema>;

export const tradeClosePayloadSchema = z.object({
  closePrice: z.number().positive(),
  notes: z.string().optional(),
});
export type TradeClosePayload = z.infer<typeof tradeClosePayloadSchema>;

export const indicatorPrimitiveSchema = z.enum([
  "EMA",
  "SMA",
  "RSI",
  "BOLLINGER_UPPER",
  "BOLLINGER_MIDDLE",
  "BOLLINGER_LOWER",
  "ATR",
  "ADX",
  "MACD",
  "STOCHASTIC",
  "OBV",
  "VOLUME_SMA",
  "HIGHEST",
  "LOWEST",
  "CHANGE",
  "STDDEV",
  "OI_DELTA",
  "FUNDING_TREND",
]);
export type IndicatorPrimitive = z.infer<typeof indicatorPrimitiveSchema>;

export const indicatorSeriesDefinitionSchema = z.object({
  id: z.string(),
  primitive: indicatorPrimitiveSchema,
  timeframe: timeFrameSchema,
  params: z.record(z.union([z.string(), z.number(), z.boolean()])),
});
export type IndicatorSeriesDefinition = z.infer<
  typeof indicatorSeriesDefinitionSchema
>;

export const conditionOperandSchema = z.union([
  z.object({ source: z.literal("series"), ref: z.string() }),
  z.object({ source: z.literal("value"), value: z.number() }),
  z.object({
    source: z.literal("price"),
    field: z.enum(["open", "high", "low", "close", "volume"]),
    timeframe: timeFrameSchema,
  }),
  z.object({ source: z.literal("funding"), valueKey: z.literal("latest") }),
  z.object({ source: z.literal("openInterest"), valueKey: z.literal("deltaPct") }),
]);
export type ConditionOperand = z.infer<typeof conditionOperandSchema>;

export const comparatorSchema = z.enum([
  "GT",
  "GTE",
  "LT",
  "LTE",
  "BETWEEN",
  "CROSSES_ABOVE",
  "CROSSES_BELOW",
]);
export type Comparator = z.infer<typeof comparatorSchema>;

const comparisonNodeSchema = z.object({
  kind: z.literal("comparison"),
  comparator: comparatorSchema,
  left: conditionOperandSchema,
  right: z.union([
    conditionOperandSchema,
    z.object({
      lower: conditionOperandSchema,
      upper: conditionOperandSchema,
    }),
  ]),
});

type ComparisonNode = z.infer<typeof comparisonNodeSchema>;

export interface LogicNode {
  kind: "logic";
  operator: "AND" | "OR";
  nodes: ConditionTree[];
}

export type ConditionTree = ComparisonNode | LogicNode;

export const conditionTreeSchema: z.ZodType<ConditionTree> = z.lazy(() =>
  z.union([
    comparisonNodeSchema,
    z.object({
      kind: z.literal("logic"),
      operator: z.enum(["AND", "OR"]),
      nodes: z.array(conditionTreeSchema).min(1),
    }),
  ]),
);

export const indicatorDSLDefinitionSchema = z.object({
  metadata: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    version: z.number().int().positive(),
  }),
  series: z.array(indicatorSeriesDefinitionSchema),
  condition: conditionTreeSchema,
  scoreAdjustment: z.number(),
  reasonLabel: z.string(),
});
export type IndicatorDSLDefinition = z.infer<
  typeof indicatorDSLDefinitionSchema
>;

export const indicatorDefinitionSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.number().int().positive(),
  status: indicatorLifecycleSchema,
  builtIn: z.boolean().default(false),
  scoreAdjustment: z.number(),
  createdAt: z.string(),
  approvedAt: z.string().nullable(),
  dsl: indicatorDSLDefinitionSchema,
});
export type IndicatorDefinition = z.infer<typeof indicatorDefinitionSchema>;

export const indicatorProposalSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
  createdAt: z.string(),
  rationale: z.string(),
  summary: z.string(),
  basedOnTradeIds: z.array(z.string()),
  proposal: indicatorDefinitionSchema,
});
export type IndicatorProposal = z.infer<typeof indicatorProposalSchema>;

export const tradeReviewReportSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  tradeId: z.string().nullable(),
  type: aiReviewTypeSchema,
  summary: z.string(),
  mistakes: z.array(z.string()),
  improvements: z.array(z.string()),
  proposedIndicatorIds: z.array(z.string()),
  confidence: z.number(),
  createdAt: z.string(),
});
export type TradeReviewReport = z.infer<typeof tradeReviewReportSchema>;

export const userSettingsSchema = z.object({
  ownerId: z.string(),
  preferredRiskPerTradePct: z.number(),
  maxSignals: z.number(),
  whitelistSymbols: z.array(z.string()),
  activeIndicatorIds: z.array(z.string()),
  scanIntervalMinutes: z.number(),
  language: z.enum(["tr", "en"]).default("tr"),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const scanRunSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  startedAt: z.string(),
  completedAt: z.string(),
  scannedSymbols: z.number(),
  shortlistedSymbols: z.number(),
  topSignalIds: z.array(z.string()),
  notes: z.array(z.string()),
});
export type ScanRun = z.infer<typeof scanRunSchema>;

export const marketUniverseEntrySchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  symbol: z.string(),
  coinName: z.string(),
  marketCapRank: z.number(),
  source: z.enum(["TOP_200", "WHITELIST"]),
  active: z.boolean(),
  updatedAt: z.string(),
});
export type MarketUniverseEntry = z.infer<typeof marketUniverseEntrySchema>;

export const modelUsageLogSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  model: z.string(),
  useCase: aiReviewTypeSchema,
  createdAt: z.string(),
  promptTokens: z.number().default(0),
  completionTokens: z.number().default(0),
});
export type ModelUsageLog = z.infer<typeof modelUsageLogSchema>;

export const performanceBreakdownSchema = z.object({
  total: z.number(),
  wins: z.number(),
  losses: z.number(),
  winRate: z.number(),
  expectancyR: z.number(),
  averageR: z.number(),
  averagePnlPct: z.number(),
  averageWinPnlPct: z.number(),
  averageLossPnlPct: z.number(),
  averageWinR: z.number(),
  averageLossR: z.number(),
  profitFactor: z.number().nullable(),
  averageHoldMinutes: z.number(),
  medianHoldMinutes: z.number(),
});
export type PerformanceBreakdown = z.infer<typeof performanceBreakdownSchema>;

export const performanceSetupStatSchema = performanceBreakdownSchema.extend({
  setup: setupTypeSchema,
});
export type PerformanceSetupStat = z.infer<typeof performanceSetupStatSchema>;

export const performanceSideStatSchema = performanceBreakdownSchema.extend({
  side: tradeSideSchema,
});
export type PerformanceSideStat = z.infer<typeof performanceSideStatSchema>;

export const performanceSnapshotSchema = z.object({
  ownerId: z.string(),
  updatedAt: z.string(),
  totalClosedTrades: z.number(),
  overallWinRate: z.number(),
  expectancyR: z.number(),
  averageR: z.number(),
  averagePnlPct: z.number(),
  averageWinPnlPct: z.number(),
  averageLossPnlPct: z.number(),
  averageHoldMinutes: z.number(),
  medianHoldMinutes: z.number(),
  profitFactor: z.number().nullable(),
  setupStats: z.array(performanceSetupStatSchema),
  sideStats: z.array(performanceSideStatSchema),
});
export type PerformanceSnapshot = z.infer<typeof performanceSnapshotSchema>;

export const walkForwardSetupStatSchema = z.object({
  setup: setupTypeSchema,
  signals: z.number(),
  winRate: z.number(),
  expectancyR: z.number(),
});
export type WalkForwardSetupStat = z.infer<typeof walkForwardSetupStatSchema>;

export const walkForwardSummarySchema = z.object({
  ownerId: z.string(),
  updatedAt: z.string(),
  symbolsEvaluated: z.number(),
  barsEvaluated: z.number(),
  totalSignals: z.number(),
  trainSignals: z.number(),
  testSignals: z.number(),
  trainWinRate: z.number(),
  testWinRate: z.number(),
  trainExpectancyR: z.number(),
  testExpectancyR: z.number(),
  testAveragePnlPct: z.number(),
  testProfitFactor: z.number().nullable(),
  averageBarsHeld: z.number(),
  signalDensityPer100Bars: z.number(),
  setupBreakdown: z.array(walkForwardSetupStatSchema),
  notes: z.array(z.string()),
});
export type WalkForwardSummary = z.infer<typeof walkForwardSummarySchema>;

export const collections = [
  "users",
  "settings",
  "marketUniverse",
  "scanRuns",
  "marketState",
  "signalCandidates",
  "signals",
  "trades",
  "tradeEvents",
  "indicatorCatalog",
  "indicatorProposals",
  "aiReviews",
  "modelUsageLogs",
] as const;
export type CollectionName = (typeof collections)[number];
