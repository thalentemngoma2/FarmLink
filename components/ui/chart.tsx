import React, { createContext, useContext } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Tooltip } from 'react-native-svg-charts';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type ChartConfig = {
  [key: string]: {
    label?: string;
    color?: string;
    theme?: {
      light: string;
      dark: string;
    };
  };
};

type ChartContextValue = {
  config: ChartConfig;
};

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------
const ChartContext = createContext<ChartContextValue | null>(null);

export const useChart = () => {
  const ctx = useContext(ChartContext);
  if (!ctx) throw new Error('useChart must be used inside <ChartContainer />');
  return ctx;
};

// -----------------------------------------------------------------------------
// Chart Container (provides config context)
// -----------------------------------------------------------------------------
interface ChartContainerProps {
  config: ChartConfig;
  children: React.ReactNode;
  style?: any;
  width?: number;    // optional fixed width (default = container width)
  height?: number;   // optional fixed height (default = 200)
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  config,
  children,
  style,
  width = Dimensions.get('window').width - 32,
  height = 200,
}) => {
  return (
    <ChartContext.Provider value={{ config }}>
      <View style={[styles.container, { width, height }, style]}>
        {children}
      </View>
    </ChartContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// Tooltip – we expose the same component name but use the library's default.
// You can customise the tooltip content by wrapping it.
// -----------------------------------------------------------------------------
export const ChartTooltip = Tooltip;

interface ChartTooltipContentProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  labelFormatter?: (value: any, payload?: any[]) => React.ReactNode;
  formatter?: (value: any, name: string, item: any, index: number, payload: any) => React.ReactNode;
  indicator?: 'dot' | 'line' | 'dashed';
  hideLabel?: boolean;
  hideIndicator?: boolean;
  nameKey?: string;
  labelKey?: string;
  color?: string;
  className?: string;
  labelClassName?: string;
}

export const ChartTooltipContent: React.FC<ChartTooltipContentProps> = () => {
  // This component is a placeholder; the library provides its own tooltip.
  // You can implement a custom tooltip using the library's Tooltip component.
  return null;
};

// -----------------------------------------------------------------------------
// Legend – a simple row of coloured labels.
// -----------------------------------------------------------------------------
export const ChartLegend: React.FC<{
  data?: Array<{ label: string; color: string }>;
  verticalAlign?: 'top' | 'bottom';
}> = ({ data, verticalAlign = 'bottom' }) => {
  if (!data || data.length === 0) return null;
  return (
    <View style={[styles.legend, verticalAlign === 'top' ? styles.legendTop : styles.legendBottom]}>
      {data.map((item, idx) => (
        <View key={idx} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text style={styles.legendLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

interface ChartLegendContentProps {
  payload?: any[];
  verticalAlign?: 'top' | 'bottom';
  hideIcon?: boolean;
  className?: string;
  nameKey?: string;
}

export const ChartLegendContent: React.FC<ChartLegendContentProps> = ({
  payload,
  verticalAlign = 'bottom',
  hideIcon,
}) => {
  const { config } = useChart();
  if (!payload) return null;
  const legendData = payload.map((item) => {
    const key = item.dataKey || item.name;
    const itemConfig = config[key];
    const label = itemConfig?.label || key;
    const color = itemConfig?.color || item.color || '#8884d8';
    return { label, color };
  });
  return <ChartLegend data={legendData} verticalAlign={verticalAlign} />;
};

// -----------------------------------------------------------------------------
// ChartStyle – a no‑op because we don't need CSS variables.
// -----------------------------------------------------------------------------
export const ChartStyle: React.FC<{ id: string; config: ChartConfig }> = () => null;

// -----------------------------------------------------------------------------
// Helper to extract config from payload (simplified)
// -----------------------------------------------------------------------------
export function getPayloadConfigFromPayload(config: ChartConfig, payload: any, key: string) {
  if (!payload) return undefined;
  const dataKey = key || payload.dataKey || payload.name;
  return config[dataKey];
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendTop: {
    marginBottom: 8,
  },
  legendBottom: {
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 2,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: '#666',
  },
});