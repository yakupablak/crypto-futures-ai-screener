"use client";

import { useEffect, useMemo, useRef } from "react";
import { ColorType, createChart } from "lightweight-charts";

export function LevelsChart({
  entry,
  stop,
  tp1,
  tp2,
}: {
  entry: number;
  stop: number;
  tp1: number;
  tp2: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const data = useMemo(() => {
    const start = 1710600000;
    const drift = tp1 > entry ? 1 : -1;
    return Array.from({ length: 24 }, (_, index) => ({
      time: (start + index * 3600) as never,
      value:
        entry +
        drift * (index - 6) * Math.abs(tp1 - entry) * 0.08 +
        Math.sin(index / 2) * Math.abs(entry - stop) * 0.2,
    }));
  }, [entry, stop, tp1]);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const chart = createChart(ref.current, {
      height: 280,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ea6b2",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.08)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.08)",
      },
      crosshair: {
        vertLine: { color: "rgba(255, 143, 61, 0.35)" },
        horzLine: { color: "rgba(255, 143, 61, 0.35)" },
      },
    });

    const series = chart.addLineSeries({
      color: "#ff8f3d",
      lineWidth: 2,
    });
    series.setData(data);

    series.createPriceLine({
      price: entry,
      color: "#ff8f3d",
      lineStyle: 1,
      axisLabelVisible: true,
      title: "Entry",
    });
    series.createPriceLine({
      price: stop,
      color: "#ff5d5d",
      lineStyle: 2,
      axisLabelVisible: true,
      title: "Stop",
    });
    series.createPriceLine({
      price: tp1,
      color: "#27c281",
      lineStyle: 1,
      axisLabelVisible: true,
      title: "TP1",
    });
    series.createPriceLine({
      price: tp2,
      color: "#9df6cf",
      lineStyle: 3,
      axisLabelVisible: true,
      title: "TP2",
    });

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver((entries) => {
      const entryBox = entries[0];
      chart.applyOptions({ width: entryBox.contentRect.width });
    });
    resizeObserver.observe(ref.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data, entry, stop, tp1, tp2]);

  return <div ref={ref} className="w-full" />;
}
