import { useEffect, useRef } from "react";
import * as echarts from "echarts";

function getChartColors() {
  const isDark = document.documentElement.classList.contains("dark");
  return {
    success: isDark ? "hsl(142, 71%, 45%)" : "hsl(142, 71%, 45%)",
    danger: isDark ? "hsl(0, 62%, 50%)" : "hsl(0, 84%, 60%)",
    warning: isDark ? "hsl(38, 92%, 50%)" : "hsl(38, 92%, 50%)",
    info: isDark ? "hsl(217, 91%, 60%)" : "hsl(217, 91%, 60%)",
    primary: "hsl(27, 90%, 52%)",
    muted: isDark ? "hsl(220, 20%, 13%)" : "hsl(220, 14%, 92%)",
    text: isDark ? "hsl(220, 10%, 92%)" : "hsl(220, 20%, 10%)",
    subtext: isDark ? "hsl(220, 10%, 55%)" : "hsl(220, 14%, 46%)",
    grid: isDark ? "hsl(220, 20%, 18%)" : "hsl(220, 14%, 87%)",
    bg: isDark ? "hsl(220, 20%, 5%)" : "hsl(220, 20%, 98%)",
  };
}

function useECharts(containerRef: React.RefObject<HTMLDivElement | null>) {
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    chartRef.current = echarts.init(containerRef.current);

    const handleResize = () => chartRef.current?.resize();
    const observer = new MutationObserver(handleResize);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      chartRef.current?.dispose();
    };
  }, []);

  return chartRef;
}

interface EquityChartProps {
  data?: { date: string; equity: number; drawdown?: number }[];
  height?: number;
}

export function EquityChart({ data, height = 320 }: EquityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useECharts(containerRef);

  useEffect(() => {
    if (!chartRef.current || !data?.length) return;
    const c = getChartColors();

    const dates = data.map((d) => d.date);
    const equityValues = data.map((d) => [d.date, d.equity]);
    const drawdownValues = data.map((d) => [d.date, d.drawdown ?? 0]);

    chartRef.current.setOption({
      backgroundColor: "transparent",
      grid: { top: 20, right: 20, bottom: 60, left: 60 },
      tooltip: {
        trigger: "axis",
        backgroundColor: c.muted,
        borderColor: c.grid,
        textStyle: { color: c.text, fontSize: 12 },
      },
      legend: {
        data: ["Equity", "Drawdown"],
        top: 0,
        textStyle: { color: c.subtext, fontSize: 11 },
      },
      xAxis: {
        type: "category",
        data: dates,
        axisLine: { lineStyle: { color: c.grid } },
        axisLabel: { color: c.subtext, fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: [
        {
          type: "value",
          name: "Equity",
          nameTextStyle: { color: c.subtext, fontSize: 11 },
          axisLine: { show: false },
          splitLine: { lineStyle: { color: c.grid, type: "dashed" as const } },
          axisLabel: { color: c.subtext, fontSize: 10 },
        },
        {
          type: "value",
          name: "Drawdown",
          nameTextStyle: { color: c.subtext, fontSize: 11 },
          axisLine: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: c.subtext,
            fontSize: 10,
            formatter: (v: unknown) => `${((v as number) * 100).toFixed(1)}%`,
          },
        },
      ],
      series: [
        {
          name: "Equity",
          type: "line",
          data: equityValues,
          smooth: true,
          lineStyle: { color: c.primary, width: 2 },
          itemStyle: { color: c.primary },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: c.primary + "40" },
              { offset: 1, color: c.primary + "05" },
            ]),
          },
          symbol: "none",
        },
        {
          name: "Drawdown",
          type: "bar",
          yAxisIndex: 1,
          data: drawdownValues,
          itemStyle: { color: c.danger + "60" },
          barWidth: "60%",
        },
      ],
    });
  }, [data]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${height}px`, width: "100%" }}
    />
  );
}

interface CorrelationMatrixProps {
  data?: { symbols: string[]; matrix: number[][] };
  height?: number;
}

export function CorrelationMatrix({ data, height = 400 }: CorrelationMatrixProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useECharts(containerRef);

  useEffect(() => {
    if (!chartRef.current || !data?.symbols?.length) return;
    const c = getChartColors();

    const heatmapData: [number, number, number][] = [];
    for (let i = 0; i < data.matrix.length; i++) {
      for (let j = 0; j < data.matrix[i].length; j++) {
        heatmapData.push([j, i, data.matrix[i][j]]);
      }
    }

    chartRef.current.setOption({
      backgroundColor: "transparent",
      tooltip: {
        position: "top",
        backgroundColor: c.muted,
        borderColor: c.grid,
        textStyle: { color: c.text, fontSize: 12 },
        formatter: (params: unknown) => {
          const p = params as { data: [number, number, number]; axisValue: string };
          const symbol = data.symbols[p.data[1]];
          return `${symbol}<br/>Correlation: <b>${p.data[2].toFixed(3)}</b>`;
        },
      },
      grid: { top: 10, right: 10, bottom: 40, left: 10, containLabel: false },
      xAxis: {
        type: "category",
        data: data.symbols,
        show: false,
      },
      yAxis: {
        type: "category",
        data: data.symbols,
        show: false,
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        inRange: {
          color: [c.danger, c.muted, c.success],
        },
        textStyle: { color: c.subtext, fontSize: 11 },
      },
      series: [
        {
          type: "heatmap",
          data: heatmapData,
          label: {
            show: true,
            color: c.text,
            fontSize: 10,
          },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.3)" },
          },
          itemStyle: {
            borderWidth: 2,
            borderColor: c.bg,
            borderRadius: 4,
          },
        },
      ],
    });
  }, [data]);

  return (
    <div
      ref={containerRef}
      style={{ height: `${height}px`, width: "100%" }}
    />
  );
}
