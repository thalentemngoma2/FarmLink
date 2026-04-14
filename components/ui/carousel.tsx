import { Ionicons } from '@expo/vector-icons';
import React, { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    ListRenderItem,
    StyleSheet,
    View,
    ViewStyle
} from 'react-native';
import { Button } from './button';

// Types
type CarouselApi = {
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  currentIndex: number;
  totalItems: number;
};

interface CarouselProps {
  children: ReactNode;
  orientation?: 'horizontal' | 'vertical'; // vertical not fully implemented
  opts?: {
    loop?: boolean;
    autoPlay?: boolean;
    autoPlayInterval?: number;
  };
  setApi?: (api: CarouselApi) => void;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

interface CarouselContextValue {
  carouselRef: React.RefObject<FlatList<any> | null>;
  currentIndex: number;
  totalItems: number;
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  orientation: 'horizontal' | 'vertical';
  loop: boolean;
  autoPlay: boolean;
}

const CarouselContext = createContext<CarouselContextValue | null>(null);

const useCarousel = () => {
  const context = useContext(CarouselContext);
  if (!context) {
    throw new Error('Carousel components must be used within a <Carousel />');
  }
  return context;
};

// ========== Carousel ==========
export const Carousel: React.FC<CarouselProps> = ({
  children,
  orientation = 'horizontal',
  opts = { loop: false, autoPlay: false, autoPlayInterval: 3000 },
  setApi,
  style,
  contentContainerStyle,
}) => {
  const flatListRef = useRef<FlatList<any>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const { loop = false, autoPlay = false, autoPlayInterval = 3000 } = opts;

  const scrollPrev = useCallback(() => {
    if (currentIndex > 0 || loop) {
      const newIndex = currentIndex === 0 && loop ? totalItems - 1 : currentIndex - 1;
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  }, [currentIndex, totalItems, loop]);

  const scrollNext = useCallback(() => {
    if (currentIndex < totalItems - 1 || loop) {
      const newIndex = currentIndex === totalItems - 1 && loop ? 0 : currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  }, [currentIndex, totalItems, loop]);

  // Provide API to parent
  const api: CarouselApi = {
    scrollPrev,
    scrollNext,
    canScrollPrev,
    canScrollNext,
    currentIndex,
    totalItems,
  };

  React.useEffect(() => {
    if (setApi) setApi(api);
  }, [api]);

  // Auto-play
  React.useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      scrollNext();
    }, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, scrollNext]);

  const onScroll = useCallback((event: any) => {
    const offset = event.nativeEvent.contentOffset.x;
    const itemWidth = Dimensions.get('window').width; // assumes each item takes full width; could be more dynamic
    const newIndex = Math.round(offset / itemWidth);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      setCanScrollPrev(newIndex > 0 || loop);
      setCanScrollNext(newIndex < totalItems - 1 || loop);
    }
  }, [currentIndex, totalItems, loop]);

  const onLayout = useCallback(() => {
    // Called after children are rendered; we need total items from children
    // We'll get totalItems from children count in render
  }, []);

  // Count children to set totalItems
  const childArray = React.Children.toArray(children);
  React.useEffect(() => {
    setTotalItems(childArray.length);
  }, [childArray.length]);

  const contextValue: CarouselContextValue = {
    carouselRef: flatListRef,
    currentIndex,
    totalItems,
    scrollPrev,
    scrollNext,
    canScrollPrev,
    canScrollNext,
    orientation,
    loop,
    autoPlay,
  };

  const renderItem: ListRenderItem<any> = ({ item, index }) => {
    return (
      <CarouselItem key={index}>
        {item}
      </CarouselItem>
    );
  };

  return (
    <CarouselContext.Provider value={contextValue}>
      <View style={[styles.carouselContainer, style]}>
        <FlatList
          ref={flatListRef}
          data={childArray}
          renderItem={renderItem}
          keyExtractor={(_, idx) => idx.toString()}
          horizontal={orientation === 'horizontal'}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
        />
      </View>
    </CarouselContext.Provider>
  );
};

// ========== CarouselContent ==========
export const CarouselContent: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => {
  const { orientation } = useCarousel();
  return (
    <View style={[styles.carouselContent, orientation === 'horizontal' ? styles.horizontalContent : styles.verticalContent, style]}>
      {children}
    </View>
  );
};

// ========== CarouselItem ==========
export const CarouselItem: React.FC<{ children: ReactNode; style?: ViewStyle }> = ({
  children,
  style,
}) => {
  const { orientation } = useCarousel();
  return (
    <View style={[styles.carouselItem, orientation === 'horizontal' ? styles.horizontalItem : styles.verticalItem, style]}>
      {children}
    </View>
  );
};

// ========== CarouselPrevious ==========
interface CarouselButtonProps {
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  style?: ViewStyle;
  disabled?: boolean;
  onPress?: () => void;
}

export const CarouselPrevious: React.FC<CarouselButtonProps> = ({
  variant = 'outline',
  size = 'icon',
  style,
  disabled,
  onPress,
}) => {
  const { scrollPrev, canScrollPrev, orientation } = useCarousel();
  const isDisabled = disabled !== undefined ? disabled : !canScrollPrev;

  const handlePress = () => {
    if (onPress) onPress();
    scrollPrev();
  };

  // Positioning styles (could be absolute, but we'll let user position them)
  // Here we provide a default positioning if no style is given (absolute in top-left)
  const defaultPosition = orientation === 'horizontal'
    ? ({ position: 'absolute', left: 10, top: '50%', transform: [{ translateY: -20 }] } as ViewStyle)
    : ({ position: 'absolute', top: 10, left: '50%', transform: [{ translateX: -20 }] } as ViewStyle);

  return (
    <Button
      variant={variant}
      size={size}
      onPress={handlePress}
      disabled={isDisabled}
      style={StyleSheet.flatten([defaultPosition, style])}
    >
      <Ionicons name="chevron-back" size={20} color={isDisabled ? '#ccc' : '#fff'} />
    </Button>
  );
};

// ========== CarouselNext ==========
export const CarouselNext: React.FC<CarouselButtonProps> = ({
  variant = 'outline',
  size = 'icon',
  style,
  disabled,
  onPress,
}) => {
  const { scrollNext, canScrollNext, orientation } = useCarousel();
  const isDisabled = disabled !== undefined ? disabled : !canScrollNext;

  const handlePress = () => {
    if (onPress) onPress();
    scrollNext();
  };

  const defaultPosition = orientation === 'horizontal'
    ? ({ position: 'absolute', right: 10, top: '50%', transform: [{ translateY: -20 }] } as ViewStyle)
    : ({ position: 'absolute', bottom: 10, left: '50%', transform: [{ translateX: -20 }] } as ViewStyle);

  return (
    <Button
      variant={variant}
      size={size}
      onPress={handlePress}
      disabled={isDisabled}
      style={StyleSheet.flatten([defaultPosition, style])}
    >
      <Ionicons name="chevron-forward" size={20} color={isDisabled ? '#ccc' : '#fff'} />
    </Button>
  );
};

// ========== Styles ==========
const styles = StyleSheet.create({
  carouselContainer: {
    flex: 1,
    position: 'relative',
  },
  contentContainer: {
    flexGrow: 1,
  },
  carouselContent: {
    flex: 1,
  },
  horizontalContent: {
    flexDirection: 'row',
  },
  verticalContent: {
    flexDirection: 'column',
  },
  carouselItem: {
    width: Dimensions.get('window').width, // each item takes full width
    height: '100%',
  },
  horizontalItem: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
  verticalItem: {
    width: '100%',
    height: Dimensions.get('window').height,
  },
});