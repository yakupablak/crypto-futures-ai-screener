import { createLogger } from "@crypto-futures/shared";
import { fetchTopMarketCapCoins, fetchUsdtPerpetualSymbols } from "@crypto-futures/analysis-core";
import type { MarketUniverseEntry } from "@crypto-futures/shared";

import { config } from "../lib/config";
import { getSettings, replaceMarketUniverse } from "../lib/persistence";

const logger = createLogger("refreshUniverseJob");
const TARGET_UNIVERSE_SIZE = 200;
const COINGECKO_PAGE_SIZE = 250;
const MAX_COINGECKO_PAGES = 8;

export async function refreshUniverseJob() {
  logger.info("Universe refresh started", {
    targetUniverseSize: TARGET_UNIVERSE_SIZE,
  });

  const [settings, binanceSymbols] = await Promise.all([
    getSettings(),
    fetchUsdtPerpetualSymbols(),
  ]);

  const symbolMap = new Map(
    binanceSymbols.map((symbol) => [symbol.baseAsset.toUpperCase(), symbol.symbol]),
  );

  const baseEntries: MarketUniverseEntry[] = [];
  const seenPerpetuals = new Set<string>();
  let pagesFetched = 0;
  let globalCoinsFetched = 0;
  let unmatchedCoins = 0;

  for (
    let page = 1;
    page <= MAX_COINGECKO_PAGES && baseEntries.length < TARGET_UNIVERSE_SIZE;
    page += 1
  ) {
    const topCoins = await fetchTopMarketCapCoins(page, COINGECKO_PAGE_SIZE, config.coinGeckoApiKey);
    pagesFetched += 1;
    globalCoinsFetched += topCoins.length;

    if (topCoins.length === 0) {
      break;
    }

    for (const coin of topCoins) {
      const perpetualSymbol = symbolMap.get(coin.symbol.toUpperCase());
      if (!perpetualSymbol) {
        unmatchedCoins += 1;
        continue;
      }

      if (seenPerpetuals.has(perpetualSymbol)) {
        continue;
      }

      seenPerpetuals.add(perpetualSymbol);
      baseEntries.push({
        id: `universe-${perpetualSymbol.toLowerCase()}`,
        ownerId: config.ownerId,
        symbol: perpetualSymbol,
        coinName: coin.name,
        marketCapRank: coin.marketCapRank,
        source: "TOP_200",
        active: true,
        updatedAt: new Date().toISOString(),
      });

      if (baseEntries.length >= TARGET_UNIVERSE_SIZE) {
        break;
      }
    }
  }

  const whitelistEntries = settings.whitelistSymbols.reduce<MarketUniverseEntry[]>(
    (entries, symbol) => {
      const normalizedSymbol = symbol.toUpperCase().replace("/", "");
      const matched = binanceSymbols.find((item) => item.symbol === normalizedSymbol);
      if (!matched) {
        return entries;
      }

      entries.push({
        id: `universe-${matched.symbol.toLowerCase()}`,
        ownerId: config.ownerId,
        symbol: matched.symbol,
        coinName: matched.baseAsset,
        marketCapRank: 9999,
        source: "WHITELIST",
        active: true,
        updatedAt: new Date().toISOString(),
      });
      return entries;
    },
    [],
  );

  const merged = new Map<string, MarketUniverseEntry>();
  [...baseEntries, ...whitelistEntries].forEach((entry) => {
    merged.set(entry.symbol, entry);
  });

  await replaceMarketUniverse([...merged.values()]);
  if (baseEntries.length < TARGET_UNIVERSE_SIZE) {
    logger.warn("Universe size below target after CoinGecko/Binance matching", {
      target: TARGET_UNIVERSE_SIZE,
      matched: baseEntries.length,
      whitelistCount: whitelistEntries.length,
      pagesFetched,
      globalCoinsFetched,
      unmatchedCoins,
      binancePerpetualCount: binanceSymbols.length,
    });
  } else {
    logger.info("Universe refresh completed", {
      matched: baseEntries.length,
      whitelistCount: whitelistEntries.length,
      totalUniverseCount: merged.size,
      pagesFetched,
      globalCoinsFetched,
      unmatchedCoins,
    });
  }

  return {
    count: merged.size,
    matchedTopCoins: baseEntries.length,
    whitelistCount: whitelistEntries.length,
    pagesFetched,
    globalCoinsFetched,
    unmatchedCoins,
  };
}
