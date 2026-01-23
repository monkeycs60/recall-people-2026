import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { Mic, PenLine, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Colors, BorderRadius } from '@/constants/theme';
import { InputMode } from './InputModeToggle';

interface AddNoteButtonProps {
  firstName: string;
  onAddNote: (mode: InputMode) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AddNoteButton({ firstName, onAddNote }: AddNoteButtonProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);
  const buttonScale = useSharedValue(1);

  const handleButtonPress = () => {
    buttonScale.value = withSpring(0.96, { damping: 15 }, () => {
      buttonScale.value = withSpring(1, { damping: 15 });
    });
    setMenuVisible(true);
  };

  const handleOptionPress = (mode: InputMode) => {
    setMenuVisible(false);
    onAddNote(mode);
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  return (
    <>
      <AnimatedPressable
        onPress={handleButtonPress}
        style={[styles.mainButton, buttonAnimatedStyle]}
      >
        <Plus size={20} color={Colors.textInverse} />
        <Text style={styles.buttonText}>
          {t('contact.addNoteButton.title', { firstName })}
        </Text>
      </AnimatedPressable>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={[styles.menuContainer, { paddingBottom: insets.bottom + 16 }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.menuHeader}>
              <View style={styles.menuHandle} />
            </View>

            <Pressable
              style={styles.menuOptionRow}
              onPress={() => handleOptionPress('audio')}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: Colors.primary }]}>
                <Mic size={22} color={Colors.textInverse} strokeWidth={2.5} />
              </View>
              <View style={styles.menuOptionTextContainer}>
                <Text style={styles.menuOptionTitle}>
                  {t('contact.addNoteButton.voiceOption')}
                </Text>
                <Text style={styles.menuOptionSubtitle}>
                  {t('contact.addNoteButton.voiceDescription', { firstName })}
                </Text>
              </View>
            </Pressable>

            <View style={styles.menuDivider} />

            <Pressable
              style={styles.menuOptionRow}
              onPress={() => handleOptionPress('text')}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: Colors.ai }]}>
                <PenLine size={22} color={Colors.textInverse} strokeWidth={2.5} />
              </View>
              <View style={styles.menuOptionTextContainer}>
                <Text style={styles.menuOptionTitle}>
                  {t('contact.addNoteButton.textOption')}
                </Text>
                <Text style={styles.menuOptionSubtitle}>
                  {t('contact.addNoteButton.textDescription', { firstName })}
                </Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  buttonText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  menuHeader: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
  },
  menuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  menuIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  menuOptionTextContainer: {
    flex: 1,
  },
  menuOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  menuOptionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 64,
  },
});
