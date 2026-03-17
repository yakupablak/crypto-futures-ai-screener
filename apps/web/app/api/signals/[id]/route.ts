import { NextResponse } from "next/server";

import { createRouteLogger } from "@/lib/api-logging";
import { getRepository } from "@/lib/repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const log = createRouteLogger(`/api/signals/${id}`, "GET");

  try {
    log.request({ id });
    const repository = getRepository();
    const signal = await repository.getSignalById(id);

    if (!signal) {
      log.warn("Signal not found", { id });
      return NextResponse.json({ error: "Signal bulunamadı." }, { status: 404 });
    }

    log.success(200, { id: signal.id, symbol: signal.symbol });
    return NextResponse.json({ data: signal });
  } catch (error) {
    log.error(error, { id });
    return NextResponse.json({ error: "Signal alınamadı." }, { status: 500 });
  }
}
