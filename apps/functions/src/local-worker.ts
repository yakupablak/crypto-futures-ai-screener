import process from "node:process";

import { createLogger } from "@crypto-futures/shared";

function safeLoadEnvFile(path: string) {
  try {
    process.loadEnvFile?.(path);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("ENOENT")) {
      throw error;
    }
  }
}

safeLoadEnvFile(".env.local");
safeLoadEnvFile("../../.env.local");

const [{ getDb }, { getSettings }, { runFullSync }] = await Promise.all([
  import("./lib/admin"),
  import("./lib/persistence"),
  import("./jobs/run-full-sync"),
]);
const logger = createLogger("localWorker");

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeWorkerState(state: Record<string, unknown>) {
  const db = getDb();
  await db.collection("marketState").doc("localWorker").set(state, { merge: true });
}

async function start() {
  let lastUniverseRun = 0;
  let lastShadowRun = 0;
  let lastPerformanceRun = 0;
  let lastWalkForwardRun = 0;

  await writeWorkerState({
    status: "STARTING",
    startedAt: new Date().toISOString(),
    mode: "LOCAL_WORKER",
  });
  logger.info("Local worker started");

  while (true) {
    try {
      const settings = await getSettings();
      const now = Date.now();
      const includeUniverse = lastUniverseRun === 0 || now - lastUniverseRun >= SIX_HOURS_MS;
      const includeShadow = lastShadowRun === 0 || now - lastShadowRun >= ONE_HOUR_MS;
      const includePerformance =
        lastPerformanceRun === 0 || now - lastPerformanceRun >= FIFTEEN_MINUTES_MS;
      const includeWalkForward =
        lastWalkForwardRun === 0 || now - lastWalkForwardRun >= SIX_HOURS_MS;

      await writeWorkerState({
        status: "SYNCING",
        heartbeatAt: new Date().toISOString(),
        nextScanIntervalMinutes: settings.scanIntervalMinutes,
      });
      logger.info("Local worker cycle started", {
        includeUniverse,
        includeShadow,
        includePerformance,
        includeWalkForward,
        nextScanIntervalMinutes: settings.scanIntervalMinutes,
      });

      const result = await runFullSync({
        includeUniverse,
        includeScan: true,
        includeShadow,
        includePerformance,
        includeWalkForward,
      });

      const completedAt = new Date().toISOString();
      if (includeUniverse) {
        lastUniverseRun = now;
      }
      if (includeShadow) {
        lastShadowRun = now;
      }
      if (includePerformance) {
        lastPerformanceRun = now;
      }
      if (includeWalkForward) {
        lastWalkForwardRun = now;
      }

      await writeWorkerState({
        status: "IDLE",
        heartbeatAt: completedAt,
        lastSuccessfulRun: completedAt,
        lastResult: result,
      });
      logger.info("Local worker cycle completed", result);

      await sleep(Math.max(settings.scanIntervalMinutes, 1) * 60 * 1000);
    } catch (error) {
      await writeWorkerState({
        status: "ERROR",
        heartbeatAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : "Unknown worker error",
      });
      logger.error("Local worker cycle failed", error);
      await sleep(60 * 1000);
    }
  }
}

void start();
