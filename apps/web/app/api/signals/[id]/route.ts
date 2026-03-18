import { NextResponse } from "next/server";

import { createRouteLogger } from "@/lib/api-logging";
import { requireApiSession } from "@/lib/auth/server";
import { getRepository } from "@/lib/repository";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const log = createRouteLogger(`/api/signals/${id}`, "GET");

  try {
    log.request({ id });
    const session = await requireApiSession(request);
    if (session instanceof NextResponse) {
      return session;
    }

    const repository = getRepository();
    const signal = await repository.getSignalById(id);

    if (!signal) {
      log.warn("Signal not found", { id });
      return NextResponse.json({ error: "Signal bulunamadi." }, { status: 404 });
    }

    log.success(200, { id: signal.id, symbol: signal.symbol });
    return NextResponse.json({ data: signal });
  } catch (error) {
    log.error(error, { id });
    return NextResponse.json({ error: "Signal alinamadi." }, { status: 500 });
  }
}
