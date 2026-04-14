import React, { createContext, useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
// Chart Container (provides theme/color context)
// -----------------------------------------------------------------------------
interface ChartContainerProps {
  config: ChartConfig;
  children: React.ReactNode;
  style?: any;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({ config, children, style }) => {
  return (
    <ChartContext.Provider value={{ config }}>
      <View style={[styles.container, style]}>
        {children}
      </View>
    </ChartContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// Tooltip (simple wrapper)
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

export const ChartTooltipContent: React.FC<ChartTooltipContentProps> = (props) => {
  const { config } = useChart();
  // You can implement a custom tooltip using the props; for simplicity we just use the default.
  return null;
};

// -----------------------------------------------------------------------------
// Legend
// -----------------------------------------------------------------------------
export const ChartLegend: React.FC<{ data?: any[]; verticalAlign?: string }> = ({ data, verticalAlign }) => {
  // Simple implementation: you can display legend items as text with color dots
  if (!data) return null;
  return (
    <View style={verticalAlign === 'top' ? styles.legendTop : styles.legendBottom}>
      {data.map((item, idx) => (
        <View key={idx} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text style={styles.legendText}>{item.label}</Text>
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
  hideIcon = false,
}) => {
  const { config } = useChart();
  if (!payload || payload.length === 0) return null;

  const legendData = payload.map((item) => {
    const key = item.name;
    const itemConfig = config[key];
    const name = itemConfig?.label || key;
    const color = item.color || itemConfig?.color || '#8884d8';
    return { label: name, color };
  });

  return <ChartLegend data={legendData} verticalAlign={verticalAlign} />;
};

// -----------------------------------------------------------------------------
// ChartStyle – no‑op (kept for compatibility)
// -----------------------------------------------------------------------------
interface ChartStyleProps {
  id: string;
  config: ChartConfig;
}

export const ChartStyle: React.FC<ChartStyleProps> = ({ id, config }) => {
  return null;
};

// -----------------------------------------------------------------------------
// Helper – retrieve configuration for a data key
// -----------------------------------------------------------------------------
export function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: any,
  key: string
) {
  if (!payload) return undefined;
  const dataKey = key || payload.dataKey || payload.name;
  return config[dataKey];
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendTop: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  legendBottom: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
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
  legendText: {
    fontSize: 12,
    color: '#666',
  },
});