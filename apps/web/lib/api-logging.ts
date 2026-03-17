import { createLogger, summarizeForLog } from "@crypto-futures/shared";

export function createRouteLogger(route: string, method: string) {
  const logger = createLogger(`web:${method}:${route}`);
  const startedAt = Date.now();

  return {
    request(body?: unknown) {
      logger.info("Request received", {
        method,
        route,
        body: summarizeForLog(body),
      });
    },
    success(status: number, data?: unknown) {
      logger.info("Response sent", {
        method,
        route,
        status,
        durationMs: Date.now() - startedAt,
        data: summarizeForLog(data),
      });
    },
    warn(message: string, data?: unknown) {
      logger.warn(message, {
        method,
        route,
        durationMs: Date.now() - startedAt,
        data: summarizeForLog(data),
      });
    },
    error(error: unknown, body?: unknown) {
      logger.error("Request failed", {
        method,
        route,
        durationMs: Date.now() - startedAt,
        body: summarizeForLog(body),
        error,
      });
    },
  };
}
