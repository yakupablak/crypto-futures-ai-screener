import { NextResponse } from "next/server";
import { z } from "zod";

import { answerSignalQuestion } from "../../../../../functions/src/lib/gemini";
import { createRouteLogger } from "@/lib/api-logging";
import { requireApiSession } from "@/lib/auth/server";
import { getRepository } from "@/lib/repository";

const schema = z.object({
  signalId: z.string().min(1),
  question: z.string().min(3),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      }),
    )
    .optional(),
});

export async function POST(request: Request) {
  const log = createRouteLogger("/api/ai/signal-chat", "POST");
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
    const signal = await repository.getSignalById(payload.signalId);

    if (!signal) {
      log.warn("Signal chat requested for missing signal", { signalId: payload.signalId });
      return NextResponse.json({ error: "Signal bulunamadi." }, { status: 404 });
    }

    const response = await answerSignalQuestion(signal, payload.question, payload.history ?? []);
    log.success(200, { signalId: signal.id, bullets: response.bullets.length });
    return NextResponse.json({ data: response });
  } catch (error) {
    log.error(error, body);
    return NextResponse.json({ error: "Signal AI yaniti uretilemedi." }, { status: 500 });
  }
}
