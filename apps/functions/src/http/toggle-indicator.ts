import { onRequest } from "firebase-functions/v2/https";

import { config } from "../lib/config";
import { toggleIndicatorState } from "../lib/persistence";

export const toggleIndicatorHttp = onRequest(
  { region: config.region, cors: true },
  async (request, response) => {
    try {
      const id = String(request.query.id ?? request.body?.id ?? "");
      const indicator = await toggleIndicatorState(id);
      response.json({ data: indicator });
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "toggleIndicator failed",
      });
    }
  },
);
