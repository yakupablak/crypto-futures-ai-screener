import { NextResponse } from "next/server";

import { createTradePayloadSchema } from "@crypto-futures/shared";

import { createRouteLogger } from "@/lib/api-logging";
import { getRepository } from "@/lib/repository";

export async function POST(request: Request) {
  const log = createRouteLogger("/api/trades", "POST");
  let body: unknown;

  try {
    body = await request.json();
    log.request(body);
    const payload = createTradePayloadSchema.parse(body);
    const repository = getRepository();
    const trade = await repository.createTrade(payload);
    log.success(201, { tradeId: trade.id, symbol: trade.symbol, status: trade.status });
    return NextResponse.json({ data: trade }, { status: 201 });
  } catch (error) {
    log.error(error, body);
    return NextResponse.json({ error: "Trade oluşturulamadı." }, { status: 500 });
  }
}
