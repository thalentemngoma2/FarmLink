import { useWindowDimensions } from 'react-native';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile(breakpoint: number = MOBILE_BREAKPOINT) {
  const { width } = useWindowDimensions();
  return width < breakpoint;
}