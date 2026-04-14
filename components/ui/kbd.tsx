import React from 'react';
import { Platform, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface KbdProps {
  children?: React.ReactNode;
  className?: string; // ignored, use style
  style?: ViewStyle;
  textStyle?: TextStyle;
}

interface KbdGroupProps {
  children?: React.ReactNode;
  className?: string; // ignored, use style
  style?: ViewStyle;
}

// -----------------------------------------------------------------------------
// Kbd – single keyboard key
// -----------------------------------------------------------------------------
export const Kbd: React.FC<KbdProps> = ({ children, style, textStyle }) => {
  return (
    <View style={[styles.kbd, style]}>
      {typeof children === 'string' ? (
        <Text style={[styles.kbdText, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
};

// -----------------------------------------------------------------------------
// KbdGroup – group of keys (e.g., ⌘ + C)
// -----------------------------------------------------------------------------
export const KbdGroup: React.FC<KbdGroupProps> = ({ children, style }) => {
  return <View style={[styles.group, style]}>{children}</View>;
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  kbd: {
    backgroundColor: '#f1f5f9',        // bg-muted
    borderRadius: 4,                    // rounded-sm
    paddingHorizontal: 6,               // px-1 (approx)
    paddingVertical: 2,                 // to match h-5
    minWidth: 20,                       // min-w-5
    alignItems: 'center',
    justifyContent: 'center',
    // inline-flex
    alignSelf: 'flex-start',
  },
  kbdText: {
    fontSize: 10,                       // text-xs
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), // font-mono? original uses font-sans, but we'll keep system
    color: '#6b7280',                   // text-muted-foreground
    textAlign: 'center',
    fontWeight: '500',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,                             // gap-1
  },
});