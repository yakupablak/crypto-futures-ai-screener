import { createLogger, type Candle, type FundingSnapshot, type OpenInterestPoint } from "@crypto-futures/shared";

const BINANCE_BASE_URL = "https://fapi.binance.com";
const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const SLOW_REQUEST_DEBUG_MS = 1500;
const SLOW_REQUEST_WARN_MS = 5000;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRY_ATTEMPTS = 2;
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

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function isRetryableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.name === "AbortError" || error.name === "TypeError";
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeCandles(candles: Candle[]) {
  const now = Date.now();
  const deduped = new Map<number, Candle>();

  for (const candle of candles) {
    const numericValues = [
      candle.openTime,
      candle.closeTime,
      candle.open,
      candle.high,
      candle.low,
      candle.close,
      candle.volume,
    ];

    if (numericValues.some((value) => !Number.isFinite(value))) {
      continue;
    }

    if (
      candle.open <= 0 ||
      candle.high <= 0 ||
      candle.low <= 0 ||
      candle.close <= 0 ||
      candle.volume < 0
    ) {
      continue;
    }

    if (candle.closeTime > now) {
      continue;
    }

    if (
      candle.high < Math.max(candle.open, candle.close, candle.low) ||
      candle.low > Math.min(candle.open, candle.close, candle.high)
    ) {
      continue;
    }

    deduped.set(candle.openTime, candle);
  }

  return [...deduped.values()].sort((left, right) => left.openTime - right.openTime);
}

function sanitizeFundingHistory(history: FundingSnapshot[]) {
  const deduped = new Map<string, FundingSnapshot>();

  for (const point of history) {
    if (!Number.isFinite(point.fundingRate)) {
      continue;
    }

    deduped.set(point.fundingTime, point);
  }

  return [...deduped.values()].sort(
    (left, right) =>
      new Date(left.fundingTime).getTime() - new Date(right.fundingTime).getTime(),
  );
}

function sanitizeOpenInterestHistory(history: OpenInterestPoint[]) {
  const deduped = new Map<string, OpenInterestPoint>();

  for (const point of history) {
    if (
      !Number.isFinite(point.sumOpenInterest) ||
      !Number.isFinite(point.sumOpenInterestValue)
    ) {
      continue;
    }

    deduped.set(point.timestamp, point);
  }

  return [...deduped.values()].sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
}

async function fetchJson<T>(
  label: string,
  url: string | URL,
  init?: RequestInit,
): Promise<T> {
  const requestUrl = typeof url === "string" ? url : url.toString();
  logger.debug("External request started", {
    label,
    method: init?.method ?? "GET",
    url: requestUrl,
  });

  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const durationMs = Date.now() - startedAt;

      if (!response.ok) {
        if (attempt < MAX_RETRY_ATTEMPTS && isRetryableStatus(response.status)) {
          logger.warn("External request will retry after non-ok response", {
            label,
            url: requestUrl,
            status: response.status,
            attempt: attempt + 1,
            maxAttempts: MAX_RETRY_ATTEMPTS + 1,
            durationMs,
          });
          await wait(250 * (attempt + 1));
          continue;
        }

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

      if (durationMs >= SLOW_REQUEST_WARN_MS) {
        logger.warn("External request completed slowly", {
          label,
          url: requestUrl,
          status: response.status,
          durationMs,
          attempt: attempt + 1,
        });
      } else if (durationMs >= SLOW_REQUEST_DEBUG_MS) {
        logger.debug("External request completed slower than baseline", {
          label,
          url: requestUrl,
          status: response.status,
          durationMs,
          attempt: attempt + 1,
        });
      } else {
        logger.debug("External request completed", {
          label,
          url: requestUrl,
          status: response.status,
          durationMs,
          attempt: attempt + 1,
        });
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeout);

      if (attempt < MAX_RETRY_ATTEMPTS && isRetryableError(error)) {
        logger.warn("External request will retry after thrown error", {
          label,
          url: requestUrl,
          attempt: attempt + 1,
          maxAttempts: MAX_RETRY_ATTEMPTS + 1,
          durationMs: Date.now() - startedAt,
          error,
        });
        await wait(250 * (attempt + 1));
        continue;
      }

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

  throw new Error(`${label} exhausted retries`);
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
    marketCapRank: coin.market_cap_rank ?? 9999,
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
  return sanitizeCandles(data.map(mapKline));
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

  return sanitizeFundingHistory(
    data.map((item) => ({
      symbol: item.symbol,
      fundingRate: Number(item.fundingRate),
      fundingTime: new Date(item.fundingTime).toISOString(),
      markPrice: item.markPrice ? Number(item.markPrice) : undefined,
    })),
  );
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

  return sanitizeOpenInterestHistory(
    data.map((item) => ({
      symbol: item.symbol,
      sumOpenInterest: Number(item.sumOpenInterest),
      sumOpenInterestValue: Number(item.sumOpenInterestValue),
      timestamp: new Date(Number(item.timestamp)).toISOString(),
    })),
  );
}
