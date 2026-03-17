import { NextResponse } from "next/server";

import { createRouteLogger } from "@/lib/api-logging";
import { getRepository } from "@/lib/repository";

export async function GET() {
  const log = createRouteLogger("/api/signals", "GET");

  try {
    log.request();
    const repository = getRepository();
    const signals = await repository.getSignals();
    log.success(200, { count: signals.length });
    return NextResponse.json({ data: signals });
  } catch (error) {
    log.error(error);
    return NextResponse.json({ error: "Signals alınamadı." }, { status: 500 });
  }
}
