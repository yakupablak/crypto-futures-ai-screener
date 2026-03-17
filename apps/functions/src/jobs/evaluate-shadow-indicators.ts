import { getDb } from "../lib/admin";
import { config } from "../lib/config";
import { listIndicators } from "../lib/persistence";

export async function evaluateShadowIndicatorsJob() {
  const db = getDb();
  const indicators = await listIndicators();
  const shadowIndicators = indicators.filter((indicator) => indicator.status === "SHADOW");

  await db.collection("marketState").doc("shadowEvaluation").set({
    ownerId: config.ownerId,
    updatedAt: new Date().toISOString(),
    shadowIndicatorCount: shadowIndicators.length,
    note:
      "Shadow indikatorler ranking'e puan olarak yansitilmadan izleniyor. Bu belge rollout izleme ozeti tutar.",
  });

  return { shadowIndicatorCount: shadowIndicators.length };
}
