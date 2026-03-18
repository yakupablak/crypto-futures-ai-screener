import { NextResponse } from "next/server";
import { z } from "zod";

import { createRouteLogger } from "@/lib/api-logging";
import { requireApiSession } from "@/lib/auth/server";
import { runFullSync } from "../../../../../functions/src/jobs/run-full-sync";

export const runtime = "nodejs";
export const maxDuration = 300;

const schema = z.object({
  mode: z.enum(["FULL", "SCAN", "UNIVERSE"]).default("FULL"),
});

function getSyncErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Senkronizasyon tamamlanamadi.";
  }

  if (error.message.includes("451")) {
    return "Binance Futures API mevcut sunucu bolgesinden erisimi engelliyor. Deploy ayari Avrupa bolgesine tasinarak duzeltildi; yeni surum aktif olduktan sonra tekrar dene.";
  }

  return "Senkronizasyon tamamlanamadi.";
}

export async function POST(request: Request) {
  const log = createRouteLogger("/api/system/sync", "POST");
  let body: unknown;

  try {
    body = await request.json();
    log.request(body);
    const session = await requireApiSession(request);
    if (session instanceof NextResponse) {
      return session;
    }

    const payload = schema.parse(body);

    const result =
      payload.mode === "UNIVERSE"
        ? await runFullSync({
            includeUniverse: true,
            includeScan: false,
            includeShadow: false,
            includePerformance: false,
            includeWalkForward: false,
          })
        : payload.mode === "SCAN"
          ? await runFullSync({
              includeUniverse: false,
              includeScan: true,
              includeShadow: true,
              includePerformance: true,
              includeWalkForward: false,
            })
          : await runFullSync({
              includeUniverse: true,
              includeScan: true,
              includeShadow: true,
              includePerformance: true,
              includeWalkForward: true,
            });

    const scan = "scan" in result ? (result.scan as Record<string, unknown>) : null;
    if (scan && Number(scan.candidateCount ?? 0) === 0) {
      log.warn("Manual sync completed with zero candidates", result);
    } else {
      log.success(200, result);
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    log.error(error, body);
    return NextResponse.json({ error: getSyncErrorMessage(error) }, { status: 500 });
  }
}
