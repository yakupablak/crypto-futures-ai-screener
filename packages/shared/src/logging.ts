type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return error;
}

export function summarizeForLog(value: unknown, depth = 2): unknown {
  if (depth <= 0) {
    return "[MaxDepth]";
  }

  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.length > 240 ? `${value.slice(0, 237)}...` : value;
  }

  if (value instanceof Error) {
    return stringifyError(value);
  }

  if (Array.isArray(value)) {
    const sample = value.slice(0, 5).map((item) => summarizeForLog(item, depth - 1));
    return {
      type: "array",
      length: value.length,
      sample,
    };
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 20);
    return Object.fromEntries(
      entries.map(([key, item]) => [key, summarizeForLog(item, depth - 1)]),
    );
  }

  return String(value);
}

function writeLog(level: LogLevel, scope: string, message: string, data?: unknown) {
  const configuredLevel = normalizeLogLevel(process.env.LOG_LEVEL);
  if (LOG_LEVEL_WEIGHT[level] < LOG_LEVEL_WEIGHT[configuredLevel]) {
    return;
  }

  const payload = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    data: data == null ? undefined : summarizeForLog(data),
  };

  const line = JSON.stringify(payload);
  if (level === "ERROR") {
    console.error(line);
    return;
  }

  if (level === "WARN") {
    console.warn(line);
    return;
  }

  console.log(line);
}

function normalizeLogLevel(value?: string | null): LogLevel {
  const normalized = value?.trim().toUpperCase();
  if (normalized === "DEBUG" || normalized === "INFO" || normalized === "WARN" || normalized === "ERROR") {
    return normalized;
  }

  return "INFO";
}

export function createLogger(scope: string) {
  return {
    info(message: string, data?: unknown) {
      writeLog("INFO", scope, message, data);
    },
    warn(message: string, data?: unknown) {
      writeLog("WARN", scope, message, data);
    },
    error(message: string, data?: unknown) {
      writeLog("ERROR", scope, message, data);
    },
    debug(message: string, data?: unknown) {
      writeLog("DEBUG", scope, message, data);
    },
  };
}
