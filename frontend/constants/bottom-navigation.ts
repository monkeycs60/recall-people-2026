import { Platform } from 'react-native';

export const CUSTOM_TAB_BAR_BOTTOM_GAP = 12;

const ANDROID_EDGE_TO_EDGE_NAV_FALLBACK = 36;

export function getBottomNavigationInset(bottomInset: number) {
  if (Platform.OS === 'android') {
    return Math.max(bottomInset, ANDROID_EDGE_TO_EDGE_NAV_FALLBACK);
  }

  return bottomInset;
}
