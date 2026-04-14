import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { LayoutRectangle, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue
} from 'react-native-reanimated';

// -----------------------------------------------------------------------------
// Types & Context
// -----------------------------------------------------------------------------
type Direction = 'horizontal' | 'vertical';

type PanelGroupContextValue = {
  direction: Direction;
  containerSize: { width: number; height: number };
  panelSizes: SharedValue<number>[];
  updatePanelSizes: (sizes: number[]) => void;
  minSize: number;
};

const PanelGroupContext = createContext<PanelGroupContextValue | undefined>(undefined);

const usePanelGroup = () => {
  const ctx = useContext(PanelGroupContext);
  if (!ctx) throw new Error('ResizablePanel components must be used within a ResizablePanelGroup');
  return ctx;
};

// -----------------------------------------------------------------------------
// ResizablePanelGroup
// -----------------------------------------------------------------------------
interface ResizablePanelGroupProps {
  children: React.ReactNode;
  direction?: Direction;
  className?: string; // ignored
  style?: any;
  onLayout?: (layout: LayoutRectangle) => void;
}

export const ResizablePanelGroup: React.FC<ResizablePanelGroupProps> = ({
  children,
  direction = 'horizontal',
  style,
  onLayout,
}) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [panelCount, setPanelCount] = useState(0);
  const [panelSizes, setPanelSizes] = useState<SharedValue<number>[]>([]);
  const [initialized, setInitialized] = useState(false);

  const minSize = 50; // minimum panel size in pixels

  // When the container is measured, calculate initial equal sizes
  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
    onLayout?.(event.nativeEvent.layout);
  };

  // Count children to know how many panels we have
  useEffect(() => {
    const count = React.Children.count(children);
    setPanelCount(count);
  }, [children]);

  // Create shared values for each panel when count changes
  useEffect(() => {
    if (panelCount > 0 && containerSize.width > 0 && !initialized) {
      const totalSize = direction === 'horizontal' ? containerSize.width : containerSize.height;
      const defaultSize = totalSize / panelCount;
      const newSizes = Array(panelCount)
        .fill(0)
        .map(() => useSharedValue(defaultSize));
      setPanelSizes(newSizes);
      setInitialized(true);
    }
  }, [panelCount, containerSize, direction, initialized]);

  const updatePanelSizes = useCallback(
    (sizes: number[]) => {
      if (sizes.length !== panelSizes.length) return;
      sizes.forEach((size, idx) => {
        panelSizes[idx].value = size;
      });
    },
    [panelSizes]
  );

  const contextValue = {
    direction,
    containerSize,
    panelSizes,
    updatePanelSizes,
    minSize,
  };

  return (
    <PanelGroupContext.Provider value={contextValue}>
      <GestureHandlerRootView style={[styles.group, style]}>
        <View
          style={[
            styles.groupInner,
            direction === 'horizontal' ? styles.horizontal : styles.vertical,
          ]}
          onLayout={handleLayout}
        >
          {React.Children.map(children, (child, index) => {
            if (!React.isValidElement(child)) return child;
            if (child.type === ResizablePanel) {
              return React.cloneElement(child as React.ReactElement<any>, {
                index,
                total: panelCount,
              });
            }
            return child;
          })}
        </View>
      </GestureHandlerRootView>
    </PanelGroupContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// ResizablePanel
// -----------------------------------------------------------------------------
interface ResizablePanelProps {
  children: React.ReactNode;
  index?: number;
  total?: number;
  style?: any;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  index = 0,
  style,
}) => {
  const { direction, panelSizes } = usePanelGroup();
  const size = panelSizes[index];

  const animatedStyle = useAnimatedStyle(() => ({
    [direction === 'horizontal' ? 'width' : 'height']: size.value,
  }));

  return (
    <Animated.View style={[styles.panel, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

// -----------------------------------------------------------------------------
// ResizableHandle
// -----------------------------------------------------------------------------
interface ResizableHandleProps {
  withHandle?: boolean;
  style?: any;
  className?: string; // ignored
  // For simplicity, we assume two panels. For more panels, you'd need to specify which panels it separates.
}

export const ResizableHandle: React.FC<ResizableHandleProps> = ({
  withHandle = false,
  style,
}) => {
  const { direction, containerSize, panelSizes, updatePanelSizes, minSize } = usePanelGroup();
  // For two panels: sizes[0] and sizes[1]
  const leftSize = panelSizes[0];
  const rightSize = panelSizes[1];
  const totalSize = direction === 'horizontal' ? containerSize.width : containerSize.height;

  const startLeft = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startLeft.value = leftSize.value;
    })
    .onUpdate((event) => {
      const delta = direction === 'horizontal' ? event.translationX : event.translationY;
      let newLeftSize = startLeft.value + delta;
      // clamp
      newLeftSize = Math.max(minSize, Math.min(totalSize - minSize, newLeftSize));
      leftSize.value = newLeftSize;
      rightSize.value = totalSize - newLeftSize;
    })
    .onEnd(() => {
      runOnJS(updatePanelSizes)([leftSize.value, rightSize.value]);
    });

  const containerStyle = [
    styles.handleContainer,
    direction === 'horizontal' ? styles.handleHorizontal : styles.handleVertical,
    style,
  ];

  const handleIcon = withHandle ? (
    <View style={styles.handleIcon}>
      <Ionicons name="menu" size={16} color="#9ca3af" />
    </View>
  ) : null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={containerStyle}>
        {handleIcon}
      </Animated.View>
    </GestureDetector>
  );
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  group: {
    flex: 1,
  },
  groupInner: {
    flex: 1,
  },
  horizontal: {
    flexDirection: 'row',
  },
  vertical: {
    flexDirection: 'column',
  },
  panel: {
    overflow: 'hidden',
  },
  handleContainer: {
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  handleHorizontal: {
    width: 4,
    marginHorizontal: -2, // center over the border
  },
  handleVertical: {
    height: 4,
    marginVertical: -2,
  },
  handleIcon: {
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 4,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 2,
  },
});