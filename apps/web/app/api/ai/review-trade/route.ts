import { NextResponse } from "next/server";
import { z } from "zod";

import { createRouteLogger } from "@/lib/api-logging";
import { getRepository } from "@/lib/repository";

const schema = z.object({
  tradeId: z.string().optional(),
});

export async function POST(request: Request) {
  const log = createRouteLogger("/api/ai/review-trade", "POST");
  let body: unknown;

  try {
    body = await request.json();
    log.request(body);
    const payload = schema.parse(body);
    const repository = getRepository();
    const review = await repository.reviewTrade(payload.tradeId);
    log.success(201, { reviewId: review.id, tradeId: review.tradeId, type: review.type });
    return NextResponse.json({ data: review }, { status: 201 });
  } catch (error) {
    log.error(error, body);
    return NextResponse.json({ error: "Trade review üretilemedi." }, { status: 500 });
  }
}
