import { onRequest } from "firebase-functions/v2/https";

import { config } from "../lib/config";
import { generateIndicatorProposals } from "../lib/gemini";
import { listClosedTrades, listIndicators, saveIndicatorProposal } from "../lib/persistence";

export const suggestIndicatorsHttp = onRequest(
  { region: config.region, cors: true },
  async (_request, response) => {
    try {
      const [trades, indicators] = await Promise.all([
        listClosedTrades(30),
        listIndicators(),
      ]);
      const proposals = await generateIndicatorProposals(trades, indicators);
      await Promise.all(proposals.map((proposal) => saveIndicatorProposal(proposal)));
      response.json({ data: proposals });
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "suggestIndicators failed",
      });
    }
  },
);
