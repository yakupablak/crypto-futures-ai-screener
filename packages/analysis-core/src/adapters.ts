import { createLogger, type Candle, type FundingSnapshot, type OpenInterestPoint } from "@crypto-futures/shared";

const BINANCE_BASE_URL = "https://fapi.binance.com";
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const logger = createLogger("marketAdapters");

type LoggedError = Error & { alreadyLogged?: boolean };

export interface UniverseCoin {
  id: string;
  symbol: string;
  name: string;
  marketCapRank: number;
}

export interface BinanceExchangeSymbol {
  symbol: string;
  status: string;
  contractType: string;
  quoteAsset: string;
  baseAsset: string;
}

async function fetchJson<T>(
  label: string,
  url: string | URL,
  init?: RequestInit,
): Promise<T> {
  const startedAt = Date.now();
  const requestUrl = typeof url === "string" ? url : url.toString();
  logger.info("External request started", {
    label,
    method: init?.method ?? "GET",
    url: requestUrl,
  });

  try {
    const response = await fetch(url, init);
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const error = new Error(`${label} failed: ${response.status}`) as LoggedError;
      error.alreadyLogged = true;
      logger.error("External request failed", {
        label,
        url: requestUrl,
        status: response.status,
        statusText: response.statusText,
        durationMs,
      });
      throw error;
    }

    if (durationMs >= 1500) {
      logger.warn("External request completed slowly", {
        label,
        url: requestUrl,
        status: response.status,
        durationMs,
      });
    } else {
      logger.info("External request completed", {
        label,
        url: requestUrl,
        status: response.status,
        durationMs,
      });
    }

    return (await response.json()) as T;
  } catch (error) {
    if (!(error instanceof Error && (error as LoggedError).alreadyLogged)) {
      logger.error("External request threw", {
        label,
        url: requestUrl,
        durationMs: Date.now() - startedAt,
        error,
      });
    }
    throw error;
  }
}

export async function fetchTopMarketCapCoins(
  page = 1,
  perPage = 200,
  apiKey?: string,
): Promise<UniverseCoin[]> {
  const url = new URL(`${COINGECKO_BASE_URL}/coins/markets`);
  url.searchParams.set("vs_currency", "usd");
  url.searchParams.set("order", "market_cap_desc");
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));
  url.searchParams.set("sparkline", "false");

  const headers: HeadersInit = {};
  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  const data = await fetchJson<
    Array<{
      id: string;
      symbol: string;
      name: string;
      market_cap_rank: number;
    }>
  >("CoinGecko markets", url, {
    headers,
  });

  return data.map((coin) => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    marketCapRank: coin.market_cap_rank,
  }));
}

export async function fetchUsdtPerpetualSymbols(): Promise<BinanceExchangeSymbol[]> {
  const payload = await fetchJson<{
    symbols: BinanceExchangeSymbol[];
  }>("Binance exchangeInfo", `${BINANCE_BASE_URL}/fapi/v1/exchangeInfo`, {});

  return payload.symbols.filter(
    (symbol) =>
      symbol.quoteAsset === "USDT" &&
      symbol.contractType === "PERPETUAL" &&
      symbol.status === "TRADING",
  );
}

function mapKline(raw: (number | string)[]): Candle {
  return {
    openTime: Number(raw[0]),
    open: Number(raw[1]),
    high: Number(raw[2]),
    low: Number(raw[3]),
    close: Number(raw[4]),
    volume: Number(raw[5]),
    closeTime: Number(raw[6]),
  };
}

export async function fetchKlines(
  symbol: string,
  interval: "1d" | "4h" | "1h" | "15m",
  limit = 260,
): Promise<Candle[]> {
  const url = new URL(`${BINANCE_BASE_URL}/fapi/v1/klines`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const data = await fetchJson<Array<(number | string)[]>>(
    `Binance klines ${symbol} ${interval}`,
    url,
  );
  return data.map(mapKline);
}

export async function fetchFundingRateHistory(
  symbol: string,
  limit = 30,
): Promise<FundingSnapshot[]> {
  const url = new URL(`${BINANCE_BASE_URL}/fapi/v1/fundingRate`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("limit", String(limit));

  const data = await fetchJson<
    Array<{
      symbol: string;
      fundingRate: string;
      fundingTime: number;
      markPrice?: string;
    }>
  >(`Binance funding ${symbol}`, url);

  return data.map((item) => ({
    symbol: item.symbol,
    fundingRate: Number(item.fundingRate),
    fundingTime: new Date(item.fundingTime).toISOString(),
    markPrice: item.markPrice ? Number(item.markPrice) : undefined,
  }));
}

export async function fetchOpenInterestHistory(
  symbol: string,
  period: "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "6h" | "12h" | "1d" = "4h",
  limit = 30,
): Promise<OpenInterestPoint[]> {
  const url = new URL(`${BINANCE_BASE_URL}/futures/data/openInterestHist`);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("period", period);
  url.searchParams.set("limit", String(limit));

  const data = await fetchJson<
    Array<{
      symbol: string;
      sumOpenInterest: string;
      sumOpenInterestValue: string;
      timestamp: string;
    }>
  >(`Binance open interest ${symbol}`, url);

  return data.map((item) => ({
    symbol: item.symbol,
    sumOpenInterest: Number(item.sumOpenInterest),
    sumOpenInterestValue: Number(item.sumOpenInterestValue),
    timestamp: new Date(Number(item.timestamp)).toISOString(),
  }));
}
