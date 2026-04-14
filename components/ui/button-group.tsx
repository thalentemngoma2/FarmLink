import React, { Children, cloneElement, isValidElement } from 'react';
import {
    StyleSheet,
    Text,
    TextStyle,
    View,
    ViewStyle,
} from 'react-native';

// ==================== Types ====================
type Orientation = 'horizontal' | 'vertical';

interface ButtonGroupProps {
  children: React.ReactNode;
  orientation?: Orientation;
  style?: ViewStyle;
}

interface ButtonGroupTextProps {
  children?: React.ReactNode;
  asChild?: boolean; // kept for API compatibility
  style?: ViewStyle;
  textStyle?: TextStyle;
}

interface SeparatorProps {
  orientation?: Orientation;
  style?: ViewStyle | ViewStyle[];
}

// ==================== Separator Component ====================
const Separator: React.FC<SeparatorProps> = ({ orientation = 'vertical', style }) => {
  const separatorStyle = StyleSheet.flatten([
    styles.separatorBase,
    orientation === 'vertical' ? styles.separatorVertical : styles.separatorHorizontal,
    style,
  ]);

  return <View style={separatorStyle} />;
};

// ==================== ButtonGroup Component ====================
export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  style,
}) => {
  const isHorizontal = orientation === 'horizontal';
  const childArray = Children.toArray(children);
  const total = childArray.length;

  const processedChildren = childArray.map((child, index) => {
    if (!isValidElement(child)) return child;

    // Determine border radius based on position and orientation
    const isFirst = index === 0;
    const isLast = index === total - 1;
    let borderRadiusStyle: ViewStyle = {};

    if (isHorizontal) {
      if (isFirst) {
        borderRadiusStyle = { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 };
      } else if (isLast) {
        borderRadiusStyle = { borderTopRightRadius: 8, borderBottomRightRadius: 8 };
      } else {
        borderRadiusStyle = { borderRadius: 0 };
      }
    } else {
      if (isFirst) {
        borderRadiusStyle = { borderTopLeftRadius: 8, borderTopRightRadius: 8 };
      } else if (isLast) {
        borderRadiusStyle = { borderBottomLeftRadius: 8, borderBottomRightRadius: 8 };
      } else {
        borderRadiusStyle = { borderRadius: 0 };
      }
    }

    // Merge with existing style (if any)
    const existingStyle = (child.props as any)?.style || {};
    const combinedStyle = StyleSheet.flatten([borderRadiusStyle, existingStyle]);

    // Clone child with updated style
    return cloneElement(child as React.ReactElement<any>, {
      ...(child.props as any),
      style: combinedStyle || {},
    });
  });

  return (
    <View
      style={[
        styles.groupContainer,
        { flexDirection: isHorizontal ? 'row' : 'column' },
        style,
      ]}
    >
      {processedChildren}
    </View>
  );
};

// ==================== ButtonGroupText Component ====================
export const ButtonGroupText: React.FC<ButtonGroupTextProps> = ({
  children,
  asChild, // ignored
  style,
  textStyle,
}) => {
  return (
    <View style={[styles.textContainer, style]}>
      <Text style={[styles.text, textStyle]}>{children}</Text>
    </View>
  );
};

// ==================== ButtonGroupSeparator Component ====================
export const ButtonGroupSeparator: React.FC<SeparatorProps> = ({
  orientation = 'vertical',
  style,
}) => {
  // Flatten all styles into a single object to avoid type conflicts
  const flattenedStyle = StyleSheet.flatten([styles.groupSeparator, style]);
  return <Separator orientation={orientation} style={flattenedStyle} />;
};

// ==================== Styles ====================
const styles = StyleSheet.create({
  groupContainer: {
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  textContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  separatorBase: {
    backgroundColor: '#e2e8f0',
  },
  separatorVertical: {
    width: 1,
    height: '100%',
  },
  separatorHorizontal: {
    height: 1,
    width: '100%',
  },
  groupSeparator: {
    alignSelf: 'stretch',
  },
});