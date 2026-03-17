import { z } from "zod";

import { NextResponse } from "next/server";

import { createRouteLogger } from "@/lib/api-logging";
import { getRepository } from "@/lib/repository";

const schema = z.object({
  context: z.string().optional(),
});

export async function POST(request: Request) {
  const log = createRouteLogger("/api/ai/suggest-indicators", "POST");
  let body: unknown;

  try {
    body = await request.json();
    log.request(body);
    const payload = schema.parse(body);
    const repository = getRepository();
    const proposals = await repository.suggestIndicators(payload.context);
    log.success(200, { count: proposals.length });
    return NextResponse.json({ data: proposals });
  } catch (error) {
    log.error(error, body);
    return NextResponse.json({ error: "Indicator önerileri üretilemedi." }, { status: 500 });
  }
}
