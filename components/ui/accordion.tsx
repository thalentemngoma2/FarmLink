import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

// Enable LayoutAnimation for Android if desired (optional)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ==================== Types ====================
type AccordionContextType = {
  openItems: string[];
  toggleItem: (value: string) => void;
};

const AccordionContext = React.createContext<AccordionContextType | undefined>(undefined);

// Helper to generate unique IDs (for demo)
let idCounter = 0;
const generateId = () => `accordion-item-${idCounter++}`;

// ==================== Accordion Root ====================
interface AccordionProps {
  children: React.ReactNode;
  type?: 'single' | 'multiple'; // Default: 'single'
  collapsible?: boolean; // For single: allow all to close
  defaultValue?: string | string[];
}

export const Accordion: React.FC<AccordionProps> = ({
  children,
  type = 'single',
  collapsible = false,
  defaultValue,
}) => {
  const [openItems, setOpenItems] = useState<string[]>(() => {
    if (!defaultValue) return [];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });

  const toggleItem = (value: string) => {
    if (type === 'single') {
      if (openItems.includes(value)) {
        if (collapsible) {
          setOpenItems([]);
        }
      } else {
        setOpenItems([value]);
      }
    } else {
      // multiple
      if (openItems.includes(value)) {
        setOpenItems(openItems.filter((v) => v !== value));
      } else {
        setOpenItems([...openItems, value]);
      }
    }
  };

  const contextValue: AccordionContextType = { openItems, toggleItem };

  return (
    <AccordionContext.Provider value={contextValue}>
      <View style={styles.accordionRoot}>{children}</View>
    </AccordionContext.Provider>
  );
};

// ==================== Accordion Item ====================
interface AccordionItemProps {
  children: React.ReactNode;
  value?: string; // unique identifier
  style?: any;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
  children,
  value,
  style,
}) => {
  const itemValue = value || generateId();
  return (
    <View style={[styles.itemContainer, style]}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { itemValue } as any);
        }
        return child;
      })}
    </View>
  );
};

// ==================== Accordion Trigger ====================
interface AccordionTriggerProps {
  children: React.ReactNode;
  itemValue?: string;
  style?: any;
}

export const AccordionTrigger: React.FC<AccordionTriggerProps> = ({
  children,
  itemValue,
  style,
}) => {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('AccordionTrigger must be used inside an Accordion');
  }
  const { openItems, toggleItem } = context;
  const isOpen = itemValue ? openItems.includes(itemValue) : false;

  const handlePress = () => {
    if (itemValue) toggleItem(itemValue);
  };

  // Shared value for rotation animation
  const rotation = useSharedValue(isOpen ? 180 : 0);

  useEffect(() => {
    rotation.value = withTiming(isOpen ? 180 : 0, { duration: 200 });
  }, [isOpen]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[styles.trigger, style]}
    >
      <View style={styles.triggerContent}>
        <View style={styles.triggerTextWrapper}>
          {typeof children === 'string' ? (
            <Text style={styles.triggerText}>{children}</Text>
          ) : (
            children
          )}
        </View>
        <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
          <Ionicons name="chevron-down" size={18} color="#687076" />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

// ==================== Accordion Content ====================
interface AccordionContentProps {
  children: React.ReactNode;
  itemValue?: string;
  style?: any;
}

export const AccordionContent: React.FC<AccordionContentProps> = ({
  children,
  itemValue,
  style,
}) => {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('AccordionContent must be used inside an Accordion');
  }
  const { openItems } = context;
  const isOpen = itemValue ? openItems.includes(itemValue) : false;

  // Measure content height for animation
  const [contentHeight, setContentHeight] = useState(0);
  const animatedHeight = useSharedValue(0);

  useEffect(() => {
    animatedHeight.value = withTiming(isOpen ? contentHeight : 0, {
      duration: 250,
    });
  }, [isOpen, contentHeight]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    opacity: interpolate(animatedHeight.value, [0, contentHeight], [0, 1], Extrapolate.CLAMP),
  }));

  const onLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0 && height !== contentHeight) {
      setContentHeight(height);
    }
  };

  return (
    <Animated.View style={[styles.contentWrapper, contentAnimatedStyle, style]}>
      <View onLayout={onLayout} style={styles.contentInner}>
        {children}
      </View>
    </Animated.View>
  );
};

// ==================== Styles ====================
const styles = StyleSheet.create({
  accordionRoot: {
    width: '100%',
  },
  itemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  trigger: {
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  triggerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triggerTextWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  triggerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#11181C',
  },
  iconWrapper: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    overflow: 'hidden',
  },
  contentInner: {
    paddingBottom: 16,
    paddingTop: 0,
  },
});