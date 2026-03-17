import { createLogger } from "@crypto-futures/shared";

import { getDb } from "../lib/admin";
import { getSettings } from "../lib/persistence";
import { aggregatePerformanceJob } from "./aggregate-performance";
import { evaluateShadowIndicatorsJob } from "./evaluate-shadow-indicators";
import { refreshUniverseJob } from "./refresh-universe";
import { runMarketScanJob } from "./run-market-scan";

const logger = createLogger("runFullSync");

export interface FullSyncOptions {
  includeUniverse?: boolean;
  includeScan?: boolean;
  includeShadow?: boolean;
  includePerformance?: boolean;
}

export async function runFullSync(options: FullSyncOptions = {}) {
  const {
    includeUniverse = true,
    includeScan = true,
    includeShadow = true,
    includePerformance = true,
  } = options;

  const db = getDb();
  const settings = await getSettings();
  const results: Record<string, unknown> = {
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
