import React from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, View, ViewStyle } from 'react-native';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface ScrollAreaProps extends ScrollViewProps {
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

// -----------------------------------------------------------------------------
// ScrollArea Component
// -----------------------------------------------------------------------------
export const ScrollArea: React.FC<ScrollAreaProps> = ({
  children,
  style,
  contentContainerStyle,
  ...props
}) => {
  return (
    <ScrollView
      style={[styles.scrollArea, style]}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      showsVerticalScrollIndicator={true}
      showsHorizontalScrollIndicator={true}
      {...props}
    >
      {children}
    </ScrollView>
  );
};

// -----------------------------------------------------------------------------
// ScrollViewport – alias for the inner container (kept for API compatibility)
// -----------------------------------------------------------------------------
export const ScrollViewport: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => {
  return <View style={[styles.viewport, style]}>{children}</View>;
};

// -----------------------------------------------------------------------------
// ScrollBar – placeholder; native scrollbars are built‑in
// -----------------------------------------------------------------------------
export const ScrollBar: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  // In React Native, scrollbars are part of ScrollView and not separately exposed.
  // This component is kept for API compatibility; it renders nothing.
  return null;
};

// -----------------------------------------------------------------------------
// ScrollThumb – placeholder
// -----------------------------------------------------------------------------
export const ScrollThumb: React.FC<{ style?: ViewStyle }> = () => {
  return null;
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  viewport: {
    flex: 1,
  },
});