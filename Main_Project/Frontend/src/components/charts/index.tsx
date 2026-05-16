import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

function getChartColors() {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    success: 'hsl(142, 71%, 45%)',
    danger: isDark ? 'hsl(0, 62%, 50%)' : 'hsl(0, 84%, 60%)',
    warning: 'hsl(38, 92%, 50%)',
    info: 'hsl(217, 91%, 60%)',
    primary: 'hsl(27, 90%, 52%)',
    muted: isDark ? 'hsl(220, 20%, 13%)' : 'hsl(220, 14%, 92%)',
    text: isDark ? 'hsl(220, 10%, 92%)' : 'hsl(220, 20%, 10%)',
    subtext: isDark ? 'hsl(220, 10%, 65%)' : 'hsl(220, 14%, 46%)',
    grid: isDark ? 'hsl(220, 20%, 18%)' : 'hsl(220, 14%, 87%)',
    bg: isDark ? 'hsl(220, 20%, 5%)' : 'hsl(220, 20%, 98%)',
  };
}

function useECharts(containerRef: React.RefObject<HTMLDivElement | null>) {
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    chartRef.current = echarts.init(containerRef.current);

    const handleResize = () => chartRef.current?.resize();
    const observer = new MutationObserver(() => {
      handleResize();
      chartRef.current?.setOption({ color: [getChartColors().primary] });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      chartRef.current?.dispose();
    };
  }, [containerRef]);

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
    const colors = getChartColors();
    const dates = data.map((item) => item.date);

    chartRef.current.setOption({
      backgroundColor: 'transparent',
      grid: { top: 36, right: 20, bottom: 48, left: 56 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.muted,
        borderColor: colors.grid,
        textStyle: { color: colors.text, fontSize: 12 },
      },
      legend: {
        data: ['Equity', 'Drawdown'],
        top: 0,
        textStyle: { color: colors.subtext, fontSize: 11 },
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: colors.grid } },
        axisLabel: { color: colors.subtext, fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Equity',
          nameTextStyle: { color: colors.subtext, fontSize: 11 },
          axisLine: { show: false },
          splitLine: { lineStyle: { color: colors.grid, type: 'dashed' } },
          axisLabel: { color: colors.subtext, fontSize: 10 },
        },
        {
          type: 'value',
          name: 'Drawdown',
          nameTextStyle: { color: colors.subtext, fontSize: 11 },
          axisLine: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: colors.subtext,
            fontSize: 10,
            formatter: (value: number) => `${(value * 100).toFixed(1)}%`,
          },
        },
      ],
      series: [
        {
          name: 'Equity',
          type: 'line',
          data: data.map((item) => [item.date, item.equity]),
          smooth: true,
          lineStyle: { color: colors.primary, width: 2 },
          itemStyle: { color: colors.primary },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: `${colors.primary}66` },
              { offset: 1, color: `${colors.primary}08` },
            ]),
          },
          symbol: 'none',
        },
        {
          name: 'Drawdown',
          type: 'bar',
          yAxisIndex: 1,
          data: data.map((item) => [item.date, item.drawdown ?? 0]),
          itemStyle: { color: `${colors.danger}99` },
          barWidth: '60%',
        },
      ],
    });
  }, [chartRef, data]);

  if (!data?.length) return null;
  return <div ref={containerRef} style={{ height: `${height}px`, width: '100%' }} />;
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
    const colors = getChartColors();
    const heatmapData: [number, number, number][] = [];

    for (let row = 0; row < data.matrix.length; row += 1) {
      for (let col = 0; col < data.matrix[row].length; col += 1) {
        heatmapData.push([col, row, data.matrix[row][col]]);
      }
    }

    chartRef.current.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        backgroundColor: colors.muted,
        borderColor: colors.grid,
        textStyle: { color: colors.text, fontSize: 12 },
        formatter: (params: unknown) => {
          const item = params as { data: [number, number, number] };
          const symbol = data.symbols[item.data[1]];
          return `${symbol}<br/>Tương quan: <b>${item.data[2].toFixed(3)}</b>`;
        },
      },
      grid: { top: 10, right: 10, bottom: 40, left: 10, containLabel: false },
      xAxis: { type: 'category', data: data.symbols, show: false },
      yAxis: { type: 'category', data: data.symbols, show: false },
      visualMap: {
        min: -1,
        max: 1,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        inRange: { color: [colors.danger, colors.muted, colors.success] },
        textStyle: { color: colors.subtext, fontSize: 11 },
      },
      series: [
        {
          type: 'heatmap',
          data: heatmapData,
          label: { show: true, color: colors.text, fontSize: 10 },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
          itemStyle: { borderWidth: 2, borderColor: colors.bg, borderRadius: 4 },
        },
      ],
    });
  }, [chartRef, data]);

  if (!data?.symbols?.length) return null;
  return <div ref={containerRef} style={{ height: `${height}px`, width: '100%' }} />;
}
