import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number) {
  if (value >= 1000) {
    return new Intl.NumberFormat("tr-TR", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (value >= 1) {
    return new Intl.NumberFormat("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  }

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(value);
}

export function formatPercent(value: number | null | undefined) {
  if (value == null) {
    return "-";
  }

  return `${value.toFixed(2)}%`;
}

export function formatRatio(value: number | null | undefined, digits = 2) {
  if (value == null) {
    return "-";
  }

  return value.toFixed(digits);
}

export function formatRMultiple(value: number | null | undefined, digits = 2) {
  if (value == null) {
    return "-";
  }

  return `${value.toFixed(digits)}R`;
}

export function formatSetupLabel(value: string) {
  const map: Record<string, string> = {
    BREAKOUT_RETEST: "Breakout Retest",
    SUPPORT_BOUNCE: "Destekten Tepki",
    CONSOLIDATION_BREAKOUT: "Konsolidasyon Breakout",
  };

  return map[value] ?? value.replaceAll("_", " ");
}

export function formatTradeStatusLabel(value: string) {
  const map: Record<string, string> = {
    OPEN: "Acik",
    CLOSED: "Kapali",
  };

  return map[value] ?? value.replaceAll("_", " ");
}

export function formatIndicatorStatusLabel(value: string) {
  const map: Record<string, string> = {
    DRAFT: "Taslak",
    VALIDATED: "Dogrulandi",
    SHADOW: "Shadow",
    LIVE: "Canli",
    DISABLED: "Pasif",
    PENDING: "Bekliyor",
    APPROVED: "Onayli",
    REJECTED: "Reddedildi",
  };

  return map[value] ?? value.replaceAll("_", " ");
}
