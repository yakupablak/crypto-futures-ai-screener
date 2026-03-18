import { NextResponse } from "next/server";

import { runFullSync } from "../../../../../functions/src/jobs/run-full-sync";

export const runtime = "nodejs";
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: "Gecersiz cron anahtari." }, { status: 401 });
}

function getBearerToken(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET tanimli degil." }, { status: 500 });
  }

  const incoming = getBearerToken(request);
  if (!incoming || incoming !== expected) {
    return unauthorized();
  }

  const result = await runFullSync({
    includeUniverse: true,
    includeScan: true,
    includeShadow: true,
    includePerformance: true,
    includeWalkForward: true,
  });
  const scan = result.scan;
  if (!scan) {
    return NextResponse.json({ error: "Cron senkronizasyonu scan verisi dondurmedi." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ownerId: result.ownerId,
    signalCount: scan.signalCount,
    candidateCount: scan.candidateCount,
    scannedSymbols: scan.scannedSymbols,
    walkForwardSignals: result.walkForward?.totalSignals ?? 0,
  });
}
