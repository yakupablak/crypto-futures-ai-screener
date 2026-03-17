import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { aggregatePerformanceJob } from "./jobs/aggregate-performance";
import { evaluateShadowIndicatorsJob } from "./jobs/evaluate-shadow-indicators";
import { refreshUniverseJob } from "./jobs/refresh-universe";
import { runMarketScanJob } from "./jobs/run-market-scan";
import { config } from "./lib/config";
import { approveIndicatorProposalHttp } from "./http/approve-indicator-proposal";
import { reviewTradeHttp } from "./http/review-trade";
import { suggestIndicatorsHttp } from "./http/suggest-indicators";
import { toggleIndicatorHttp } from "./http/toggle-indicator";

export {
  reviewTradeHttp,
  suggestIndicatorsHttp,
  approveIndicatorProposalHttp,
  toggleIndicatorHttp,
};

export const refreshUniverse = onSchedule(
  { schedule: "every 6 hours", region: config.region, timeoutSeconds: 540 },
  async () => {
    const result = await refreshUniverseJob();
    logger.info("refreshUniverse completed", result);
  },
);

export const runMarketScan = onSchedule(
  { schedule: "every 15 minutes", region: config.region, timeoutSeconds: 540 },
  async () => {
    const result = await runMarketScanJob();
    logger.info("runMarketScan completed", result);
  },
);

export const evaluateShadowIndicators = onSchedule(
  { schedule: "every 60 minutes", region: config.region, timeoutSeconds: 540 },
  async () => {
    const result = await evaluateShadowIndicatorsJob();
    logger.info("evaluateShadowIndicators completed", result);
  },
);

export const aggregatePerformance = onSchedule(
  { schedule: "every 24 hours", region: config.region, timeoutSeconds: 540 },
  async () => {
    const result = await aggregatePerformanceJob();
    logger.info("aggregatePerformance completed", result);
  },
);
