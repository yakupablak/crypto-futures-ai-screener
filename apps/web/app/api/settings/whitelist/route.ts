import { NextResponse } from "next/server";
import { z } from "zod";

import { createRouteLogger } from "@/lib/api-logging";
import { requireApiSession } from "@/lib/auth/server";
import { getRepository } from "@/lib/repository";

const schema = z.object({
  symbol: z.string().min(1),
  action: z.enum(["add", "remove"]).default("add"),
});

export async function POST(request: Request) {
  const log = createRouteLogger("/api/settings/whitelist", "POST");
  let body: unknown;

  try {
    body = await request.json();
    log.request(body);
    const session = await requireApiSession(request);
    if (session instanceof NextResponse) {
      return session;
    }

    const payload = schema.parse(body);
    const repository = getRepository();
    const settings = await repository.updateWhitelistSymbol(payload.symbol, payload.action);
    log.success(200, {
      action: payload.action,
      symbol: payload.symbol,
      whitelistCount: settings.whitelistSymbols.length,
    });
    return NextResponse.json({ data: settings });
  } catch (error) {
    log.error(error, body);
    return NextResponse.json({ error: "Whitelist guncellenemedi." }, { status: 500 });
  }
}
