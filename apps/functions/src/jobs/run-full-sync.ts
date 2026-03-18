import { createLogger } from "@crypto-futures/shared";

import { getDb } from "../lib/admin";
import { getSettings } from "../lib/persistence";
import { aggregatePerformanceJob } from "./aggregate-performance";
import { evaluateShadowIndicatorsJob } from "./evaluate-shadow-indicators";
import { refreshUniverseJob } from "./refresh-universe";
import { runMarketScanJob } from "./run-market-scan";
import { runWalkForwardJob } from "./run-walk-forward";

const logger = createLogger("runFullSync");

export interface FullSyncOptions {
  includeUniverse?: boolean;
  includeScan?: boolean;
  includeShadow?: boolean;
  includePerformance?: boolean;
  includeWalkForward?: boolean;
}

export interface FullSyncResult {
  ownerId: string;
  universe?: Awaited<ReturnType<typeof refreshUniverseJob>>;
  scan?: Awaited<ReturnType<typeof runMarketScanJob>>;
  shadow?: Awaited<ReturnType<typeof evaluateShadowIndicatorsJob>>;
  performance?: Awaited<ReturnType<typeof aggregatePerformanceJob>>;
  walkForward?: Awaited<ReturnType<typeof runWalkForwardJob>>;
}

export async function runFullSync(options: FullSyncOptions = {}): Promise<FullSyncResult> {
  const {
    includeUniverse = true,
    includeScan = true,
    includeShadow = true,
    includePerformance = true,
    includeWalkForward = false,
  } = options;

  const db = getDb();
  const settings = await getSettings();
  const results: FullSyncResult = {
    ownerId: settings.ownerId,
  };

  await db.collection("marketState").doc("localSync").set(
    {
      ownerId: settings.ownerId,
      status: "RUNNING",
      startedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  try {
    logger.info("Full sync started", {
      includeUniverse,
      includeScan,
      includeShadow,
      includePerformance,
      includeWalkForward,
      ownerId: settings.ownerId,
    });

    if (includeUniverse) {
      results.universe = await refreshUniverseJob();
    }

    if (includeScan) {
      results.scan = await runMarketScanJob();
    }

    if (includeShadow) {
      results.shadow = await evaluateShadowIndicatorsJob();
    }

    if (includePerformance) {
      results.performance = await aggregatePerformanceJob();
    }

    if (includeWalkForward) {
      results.walkForward = await runWalkForwardJob();
    }

    await db.collection("marketState").doc("localSync").set(
      {
        ownerId: settings.ownerId,
        status: "IDLE",
        completedAt: new Date().toISOString(),
        lastSuccessfulRun: new Date().toISOString(),
        lastResult: results,
      },
      { merge: true },
    );

    logger.info("Full sync completed", results);

    return results;
  } catch (error) {
    await db.collection("marketState").doc("localSync").set(
      {
        ownerId: settings.ownerId,
        status: "ERROR",
        completedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : "Unknown sync error",
      },
      { merge: true },
    );
    logger.error("Full sync failed", error);
    throw error;
  }
}
