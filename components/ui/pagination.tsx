import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Button } from './button';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  boundaryCount?: number;
  showPreviousNext?: boolean;
  showEllipsis?: boolean;
  style?: ViewStyle;
}

// -----------------------------------------------------------------------------
// Helper: generate page range with ellipsis
// -----------------------------------------------------------------------------
const getPageRange = (
  current: number,
  total: number,
  siblingCount = 1,
  boundaryCount = 1,
  showEllipsis = true
): (number | 'ellipsis')[] => {
  const totalNumbers = siblingCount * 2 + boundaryCount * 2 + 1;
  const totalPages = total;

  if (totalPages <= totalNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(current - siblingCount, 1);
  const rightSiblingIndex = Math.min(current + siblingCount, totalPages);

  const shouldShowLeftEllipsis = leftSiblingIndex > boundaryCount + 1;
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - boundaryCount;

  const firstPage = 1;
  const lastPage = totalPages;

  const items: (number | 'ellipsis')[] = [];

  items.push(firstPage);

  if (shouldShowLeftEllipsis && showEllipsis) {
    items.push('ellipsis');
  }

  for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
    if (i !== firstPage && i !== lastPage) {
      items.push(i);
    }
  }

  if (shouldShowRightEllipsis && showEllipsis) {
    items.push('ellipsis');
  }

  if (lastPage !== firstPage) {
    items.push(lastPage);
  }

  return items;
};

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  boundaryCount = 1,
  showPreviousNext = true,
  showEllipsis = true,
  style,
}) => {
  const pageRange = getPageRange(currentPage, totalPages, siblingCount, boundaryCount, showEllipsis);

  const goToPrevious = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const goToNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <View style={[styles.container, style]} accessibilityLabel="pagination">
      <View style={styles.content}>
        {showPreviousNext && (
          <View style={styles.item}>
            <Button
              variant="ghost"
              size="icon"
              onPress={goToPrevious}
              disabled={currentPage === 1}
              style={StyleSheet.flatten([styles.button, currentPage === 1 && styles.disabledButton])}
            >
              <Ionicons name="chevron-back" size={18} color="#666" />
            </Button>
          </View>
        )}

        {pageRange.map((item, idx) => {
          if (item === 'ellipsis') {
            return (
              <View key={`ellipsis-${idx}`} style={styles.item}>
                <View style={styles.ellipsis}>
                  <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
                </View>
              </View>
            );
          }

          const isActive = item === currentPage;
          return (
            <View key={item} style={styles.item}>
              <Button
                variant={isActive ? 'outline' : 'ghost'}
                size="icon"
                onPress={() => onPageChange(item)}
                style={StyleSheet.flatten([
                  styles.button,
                  isActive && styles.activeButton,
                ])}
              >
                <Text style={[styles.pageNumber, isActive && styles.activePageNumber]}>{item}</Text>
              </Button>
            </View>
          );
        })}

        {showPreviousNext && (
          <View style={styles.item}>
            <Button
              variant="ghost"
              size="icon"
              onPress={goToNext}
              disabled={currentPage === totalPages}
              style={StyleSheet.flatten([styles.button, currentPage === totalPages && styles.disabledButton])}
            >
              <Ionicons name="chevron-forward" size={18} color="#666" />
            </Button>
          </View>
        )}
      </View>
    </View>
  );
};

// -----------------------------------------------------------------------------
// Sub‑components (for custom use, matching original API)
// -----------------------------------------------------------------------------
export const PaginationContent: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.content, style]}>{children}</View>;

export const PaginationItem: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => <View style={[styles.item, style]}>{children}</View>;

interface PaginationLinkProps {
  children: React.ReactNode;
  isActive?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const PaginationLink: React.FC<PaginationLinkProps> = ({
  children,
  isActive = false,
  size = 'icon',
  onPress,
  disabled,
  style,
}) => (
  <Button
    variant={isActive ? 'outline' : 'ghost'}
    size={size}
    onPress={onPress}
    disabled={disabled}
    style={StyleSheet.flatten([styles.button, isActive && styles.activeButton, style])}
  >
    {typeof children === 'string' ? (
      <Text style={[styles.pageNumber, isActive && styles.activePageNumber]}>{children}</Text>
    ) : (
      children
    )}
  </Button>
);

interface PaginationPreviousProps {
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const PaginationPrevious: React.FC<PaginationPreviousProps> = ({
  onPress,
  disabled,
  style,
}) => (
  <PaginationLink onPress={onPress} disabled={disabled} size="default" style={StyleSheet.flatten([styles.prevNext, style])}>
    <Ionicons name="chevron-back" size={18} color="#666" />
    <Text style={styles.prevNextText}>Previous</Text>
  </PaginationLink>
);

interface PaginationNextProps {
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const PaginationNext: React.FC<PaginationNextProps> = ({
  onPress,
  disabled,
  style,
}) => (
  <PaginationLink onPress={onPress} disabled={disabled} size="default" style={StyleSheet.flatten([styles.prevNext, style])}>
    <Text style={styles.prevNextText}>Next</Text>
    <Ionicons name="chevron-forward" size={18} color="#666" />
  </PaginationLink>
);

export const PaginationEllipsis: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.ellipsis, style]}>
    <Ionicons name="ellipsis-horizontal" size={18} color="#666" />
  </View>
);

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  item: {
    // container for each pagination item
  },
  button: {
    minWidth: 36,
    height: 36,
    borderRadius: 6,
  },
  activeButton: {
    borderColor: '#22c55e',
  },
  disabledButton: {
    opacity: 0.5,
  },
  pageNumber: {
    fontSize: 14,
    color: '#11181C',
  },
  activePageNumber: {
    color: '#22c55e',
    fontWeight: '600',
  },
  prevNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  prevNextText: {
    fontSize: 14,
    color: '#11181C',
  },
  ellipsis: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});