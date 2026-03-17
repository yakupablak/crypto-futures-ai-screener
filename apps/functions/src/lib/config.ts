export const config = {
  region: "europe-west1",
  ownerId: process.env.APP_OWNER_UID ?? "local-owner",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-pro",
  geminiFastModel: process.env.GEMINI_FAST_MODEL ?? "gemini-2.5-flash-lite",
  coinGeckoApiKey: process.env.COINGECKO_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
};
