import { NextResponse } from "next/server";

import { createRouteLogger } from "@/lib/api-logging";
import { requireApiSession } from "@/lib/auth/server";
import { getRepository } from "@/lib/repository";

export async function GET(request: Request) {
  const log = createRouteLogger("/api/signals", "GET");

  try {
    log.request();
    const session = await requireApiSession(request);
    if (session instanceof NextResponse) {
      return session;
    }

    const repository = getRepository();
    const signals = await repository.getSignals();
    log.success(200, { count: signals.length });
    return NextResponse.json({ data: signals });
  } catch (error) {
    log.error(error);
    return NextResponse.json({ error: "Signals alinamadi." }, { status: 500 });
  }
}
