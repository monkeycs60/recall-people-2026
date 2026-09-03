import { useSyncExternalStore } from 'react';
import { Keyboard, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Android runs edge-to-edge (`edgeToEdgeEnabled`), so the window is never resized
 * when the IME opens even though the manifest declares `adjustResize`. Declaring
 * `adjustPan` is what makes the sheet offset itself above the keyboard.
 */
export const sheetKeyboardProps = {
  keyboardBehavior: 'interactive',
  keyboardBlurBehavior: 'restore',
  android_keyboardInputMode: 'adjustPan',
} as const;

function subscribeToKeyboard(onStoreChange: () => void): () => void {
  const showSubscription = Keyboard.addListener('keyboardDidShow', onStoreChange);
  const hideSubscription = Keyboard.addListener('keyboardDidHide', onStoreChange);

  return () => {
    showSubscription.remove();
    hideSubscription.remove();
  };
}

function getKeyboardHeight(): number {
  return Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0;
}

export function useKeyboardHeight(): number {
  return useSyncExternalStore(subscribeToKeyboard, getKeyboardHeight, () => 0);
}

export function useSheetMaxHeight(): number {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  return Math.max(280, height - insets.top - keyboardHeight - 12);
}
