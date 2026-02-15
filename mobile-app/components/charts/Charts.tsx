import React, { useMemo } from 'react';
import { View, Dimensions } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const CHART_HEIGHT = 180;
const PADDING = { left: 8, right: 8, top: 8, bottom: 24 };

export interface LineChartProps<T> {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  color?: string;
  strokeWidth?: number;
  tension?: number;
  showDots?: boolean;
  dotSize?: number;
  width?: number;
  height?: number;
  yDomain?: [number, number];
}

export function LineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  color = '#1E3A8A',
  strokeWidth = 2,
  tension = 0.2,
  showDots = true,
  dotSize = 6,
  width: propWidth,
  height = CHART_HEIGHT,
  yDomain,
}: LineChartProps<T>) {
  const { width } = Dimensions.get('window');
  const chartWidth = propWidth ?? width - 48;
  const innerWidth = chartWidth - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const { path, points, yMin, yMax } = useMemo(() => {
    if (!data.length) return { path: '', points: [], yMin: 0, yMax: 1 };

    const xVals = data.map((d) => String(d[xKey]));
    const yVals = data.map((d) => Number(d[yKey]));
    const yMinVal = yDomain ? yDomain[0] : Math.min(...yVals) - 0.1;
    const yMaxVal = yDomain ? yDomain[1] : Math.max(...yVals) + 0.1;
    const yRange = yMaxVal - yMinVal || 1;

    const points = data.map((d, i) => {
      const x = PADDING.left + (i / Math.max(1, data.length - 1)) * innerWidth;
      const y = PADDING.top + innerHeight - ((Number(d[yKey]) - yMinVal) / yRange) * innerHeight;
      return { x, y, val: Number(d[yKey]) };
    });

    let pathStr = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathStr += ` L ${points[i].x} ${points[i].y}`;
    }

    return { path: pathStr, points, yMin: yMinVal, yMax: yMaxVal };
  }, [data, xKey, yKey, innerWidth, innerHeight, yDomain]);

  if (!data.length) return <View style={{ width: chartWidth, height }} />;

  return (
    <Svg width={chartWidth} height={height}>
      <Path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {showDots &&
        points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={dotSize} fill={color} />
        ))}
    </Svg>
  );
}

export interface AreaChartProps<T> {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  color?: string;
  opacity?: number;
  width?: number;
  height?: number;
  yDomain?: [number, number];
}

export function AreaChart<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  color = '#3B82F6',
  opacity = 0.3,
  width: propWidth,
  height = CHART_HEIGHT,
  yDomain,
}: AreaChartProps<T>) {
  const { width } = Dimensions.get('window');
  const chartWidth = propWidth ?? width - 48;
  const innerWidth = chartWidth - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const areaPath = useMemo(() => {
    if (!data.length) return '';

    const yVals = data.map((d) => Number(d[yKey]));
    const yMinVal = yDomain ? yDomain[0] : Math.min(...yVals) - 0.05;
    const yMaxVal = yDomain ? yDomain[1] : Math.max(...yVals) + 0.05;
    const yRange = yMaxVal - yMinVal || 1;

    const points = data.map((d, i) => {
      const x = PADDING.left + (i / Math.max(1, data.length - 1)) * innerWidth;
      const y = PADDING.top + innerHeight - ((Number(d[yKey]) - yMinVal) / yRange) * innerHeight;
      return { x, y };
    });

    let path = `M ${points[0].x} ${innerHeight + PADDING.top} L ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    path += ` L ${points[points.length - 1].x} ${innerHeight + PADDING.top} Z`;
    return path;
  }, [data, xKey, yKey, innerWidth, innerHeight, yDomain]);

  if (!data.length) return <View style={{ width: chartWidth, height }} />;

  return (
    <Svg width={chartWidth} height={height}>
      <Path d={areaPath} fill={color} fillOpacity={opacity} stroke="none" />
    </Svg>
  );
}
