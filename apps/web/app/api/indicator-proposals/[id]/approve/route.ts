import { NextResponse } from "next/server";

import { createRouteLogger } from "@/lib/api-logging";
import { requireApiSession } from "@/lib/auth/server";
import { getRepository } from "@/lib/repository";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const log = createRouteLogger(`/api/indicator-proposals/${id}/approve`, "POST");

  try {
    log.request({ id });
    const session = await requireApiSession(request);
    if (session instanceof NextResponse) {
      return session;
    }

    const repository = getRepository();
    const indicator = await repository.approveIndicatorProposal(id);
    log.success(200, { id: indicator.id, status: indicator.status });
    return NextResponse.json({ data: indicator });
  } catch (error) {
    log.error(error, { id });
    return NextResponse.json({ error: "Indicator proposal onaylanamadi." }, { status: 500 });
  }
}
