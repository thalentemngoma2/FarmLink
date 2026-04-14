import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

// -----------------------------------------------------------------------------
// Types & Context
// -----------------------------------------------------------------------------
type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

const useTabs = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within a <Tabs />');
  return ctx;
};

// -----------------------------------------------------------------------------
// Tabs Root
// -----------------------------------------------------------------------------
interface TabsProps {
  children: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  style?: ViewStyle;
}

export const Tabs: React.FC<TabsProps> = ({
  children,
  value: controlledValue,
  onValueChange,
  defaultValue,
  style,
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || '');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;

  const setValue = useCallback(
    (newValue: string) => {
      if (!isControlled) setUncontrolledValue(newValue);
      onValueChange?.(newValue);
    },
    [isControlled, onValueChange]
  );

  const contextValue = { value, onValueChange: setValue };

  return (
    <TabsContext.Provider value={contextValue}>
      <View style={[styles.container, style]}>{children}</View>
    </TabsContext.Provider>
  );
};

// -----------------------------------------------------------------------------
// TabsList – horizontal scrollable list of triggers
// -----------------------------------------------------------------------------
interface TabsListProps {
  children: ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export const TabsList: React.FC<TabsListProps> = ({
  children,
  style,
  contentContainerStyle,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.list, style]}
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
    >
      {children}
    </ScrollView>
  );
};

// -----------------------------------------------------------------------------
// TabsTrigger
// -----------------------------------------------------------------------------
interface TabsTriggerProps {
  children: ReactNode;
  value: string;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  children,
  value,
  disabled = false,
  style,
  textStyle,
}) => {
  const { value: selectedValue, onValueChange } = useTabs();
  const isActive = selectedValue === value;

  const handlePress = () => {
    if (!disabled) onValueChange(value);
  };

  return (
    <TouchableOpacity
      style={[
        styles.trigger,
        isActive && styles.triggerActive,
        disabled && styles.triggerDisabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.triggerText,
          isActive && styles.triggerTextActive,
          disabled && styles.triggerTextDisabled,
          textStyle,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
};

// -----------------------------------------------------------------------------
// TabsContent – only visible when active
// -----------------------------------------------------------------------------
interface TabsContentProps {
  children: ReactNode;
  value: string;
  style?: ViewStyle;
}

export const TabsContent: React.FC<TabsContentProps> = ({ children, value, style }) => {
  const { value: selectedValue } = useTabs();

  if (selectedValue !== value) return null;

  return <View style={[styles.content, style]}>{children}</View>;
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flexGrow: 0,
    backgroundColor: '#f1f5f9', // bg-muted
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  listContent: {
    alignItems: 'center',
  },
  trigger: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginHorizontal: 2,
    backgroundColor: 'transparent',
  },
  triggerActive: {
    backgroundColor: '#fff', // bg-background
    boxShadow: '0px 2px 8px rgba(0,0,0,0.1)',
    elevation: 1,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280', // text-muted-foreground
  },
  triggerTextActive: {
    color: '#11181C', // text-foreground
  },
  triggerTextDisabled: {
    color: '#9ca3af',
  },
  content: {
    flex: 1,
  },
});