import React from 'react';
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
// Types
// -----------------------------------------------------------------------------
interface TableProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

interface TableHeaderProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface TableBodyProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface TableFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

interface TableRowProps {
  children: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  style?: ViewStyle;
}

interface TableHeadProps {
  children: React.ReactNode;
  style?: TextStyle;
}

interface TableCellProps {
  children: React.ReactNode;
  style?: TextStyle;
}

interface TableCaptionProps {
  children: React.ReactNode;
  style?: TextStyle;
}

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------
export const Table: React.FC<TableProps> = ({
  children,
  style,
  contentContainerStyle,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      style={[styles.tableContainer, style]}
      contentContainerStyle={[styles.tableContent, contentContainerStyle]}
    >
      <View style={styles.table}>{children}</View>
    </ScrollView>
  );
};

export const TableHeader: React.FC<TableHeaderProps> = ({ children, style }) => {
  return <View style={[styles.header, style]}>{children}</View>;
};

export const TableBody: React.FC<TableBodyProps> = ({ children, style }) => {
  return <View style={[styles.body, style]}>{children}</View>;
};

export const TableFooter: React.FC<TableFooterProps> = ({ children, style }) => {
  return <View style={[styles.footer, style]}>{children}</View>;
};

export const TableRow: React.FC<TableRowProps> = ({
  children,
  onPress,
  selected,
  style,
}) => {
  const rowStyle = [
    styles.row,
    onPress && styles.rowPressable,
    selected && styles.rowSelected,
    style,
  ];

  const RowComponent = onPress ? TouchableOpacity : View;

  return (
    <RowComponent
      style={rowStyle}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      {children}
    </RowComponent>
  );
};

export const TableHead: React.FC<TableHeadProps> = ({ children, style }) => {
  return (
    <Text style={[styles.head, style]} numberOfLines={1}>
      {children}
    </Text>
  );
};

export const TableCell: React.FC<TableCellProps> = ({ children, style }) => {
  return (
    <Text style={[styles.cell, style]} numberOfLines={1}>
      {children}
    </Text>
  );
};

export const TableCaption: React.FC<TableCaptionProps> = ({ children, style }) => {
  return <Text style={[styles.caption, style]}>{children}</Text>;
};

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  tableContainer: {
    flex: 1,
  },
  tableContent: {
    flexGrow: 1,
  },
  table: {
    flexDirection: 'column',
    minWidth: '100%',
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  body: {
    // no extra style
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  rowPressable: {
    // just for press feedback
  },
  rowSelected: {
    backgroundColor: '#f3f4f6',
  },
  head: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#11181C',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  cell: {
    flex: 1,
    fontSize: 14,
    color: '#11181C',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  caption: {
    marginTop: 8,
    fontSize: 12,
    color: '#687076',
    textAlign: 'center',
  },
});