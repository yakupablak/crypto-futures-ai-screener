import { onRequest } from "firebase-functions/v2/https";

import { config } from "../lib/config";
import { listIndicatorProposals, saveIndicator, updateProposalStatus } from "../lib/persistence";

export const approveIndicatorProposalHttp = onRequest(
  { region: config.region, cors: true },
  async (request, response) => {
    try {
      const id = String(request.query.id ?? request.body?.id ?? "");
      const proposals = await listIndicatorProposals();
      const proposal = proposals.find((item) => item.id === id);
      if (!proposal) {
        response.status(404).json({ error: "Proposal not found" });
        return;
      }

      const indicator = {
        ...proposal.proposal,
        status: "SHADOW" as const,
        approvedAt: new Date().toISOString(),
      };

      await saveIndicator(indicator);
      await updateProposalStatus(id, "APPROVED");
      response.json({ data: indicator });
    } catch (error) {
      response.status(400).json({
        error:
          error instanceof Error ? error.message : "approveIndicatorProposal failed",
      });
    }
  },
);
