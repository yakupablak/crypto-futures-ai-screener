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
