import { NextResponse } from "next/server";

import { tradeClosePayloadSchema } from "@crypto-futures/shared";

import { createRouteLogger } from "@/lib/api-logging";
import { requireApiSession } from "@/lib/auth/server";
import { getRepository } from "@/lib/repository";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const log = createRouteLogger(`/api/trades/${id}/close`, "POST");
  let body: unknown;

  try {
    body = await request.json();
    log.request({ id, body });
    const session = await requireApiSession(request);
    if (session instanceof NextResponse) {
      return session;
    }

    const payload = tradeClosePayloadSchema.parse(body);
    const repository = getRepository();
    const trade = await repository.closeTrade(id, payload);
    log.success(200, { tradeId: trade.id, status: trade.status, closePrice: trade.closePrice });
    return NextResponse.json({ data: trade });
  } catch (error) {
    log.error(error, { id, body });
    return NextResponse.json({ error: "Trade kapatilamadi." }, { status: 500 });
  }
}
