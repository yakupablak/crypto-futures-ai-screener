import type {
  CreateTradePayload,
  IndicatorDefinition,
  IndicatorProposal,
  PerformanceSnapshot,
  ScanRun,
  SignalCandidate,
  SignalSnapshot,
  TradeClosePayload,
  TradeJournalEntry,
  TradeReviewReport,
  UserSettings,
  WalkForwardSummary,
} from "@crypto-futures/shared";

export interface DashboardData {
  latestScan: ScanRun | null;
  signals: SignalSnapshot[];
  candidates: SignalCandidate[];
  trades: TradeJournalEntry[];
  aiReviews: TradeReviewReport[];
  indicators: IndicatorDefinition[];
  proposals: IndicatorProposal[];
  settings: UserSettings;
  performance: PerformanceSnapshot | null;
  walkForward: WalkForwardSummary | null;
}

export interface DataRepository {
  getDashboardData(): Promise<DashboardData>;
  getSignals(): Promise<SignalSnapshot[]>;
  getSignalCandidates(): Promise<SignalCandidate[]>;
  getSignalById(id: string): Promise<SignalSnapshot | null>;
  getTrades(): Promise<TradeJournalEntry[]>;
  getSettings(): Promise<UserSettings>;
  getIndicators(): Promise<IndicatorDefinition[]>;
  getIndicatorProposals(): Promise<IndicatorProposal[]>;
  getAIReviews(): Promise<TradeReviewReport[]>;
  getScanRuns(): Promise<ScanRun[]>;
  createTrade(payload: CreateTradePayload): Promise<TradeJournalEntry>;
  closeTrade(id: string, payload: TradeClosePayload): Promise<TradeJournalEntry>;
  approveIndicatorProposal(id: string): Promise<IndicatorDefinition>;
  toggleIndicator(id: string): Promise<IndicatorDefinition>;
  reviewTrade(tradeId?: string): Promise<TradeReviewReport>;
  suggestIndicators(context?: string): Promise<IndicatorProposal[]>;
  updateWhitelistSymbol(symbol: string, action: "add" | "remove"): Promise<UserSettings>;
}
