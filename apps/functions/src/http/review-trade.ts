import { onRequest } from "firebase-functions/v2/https";
import { z } from "zod";

import { config } from "../lib/config";
import { generateTradeReview } from "../lib/gemini";
import { getTradeById, listClosedTrades, saveAIReview } from "../lib/persistence";

const schema = z.object({
  tradeId: z.string().optional(),
});

export const reviewTradeHttp = onRequest({ region: config.region, cors: true }, async (request, response) => {
  try {
    const body = schema.parse(request.body ?? {});
    const trade =
      body.tradeId != null
        ? await getTradeById(body.tradeId)
        : (await listClosedTrades(1))[0] ?? null;
    const review = await generateTradeReview(trade);
    await saveAIReview(review);
    response.json({ data: review });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "reviewTrade failed",
    });
  }
});
