import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/theme';
import { HotTopic, Contact } from '@/types';
import { ContactAvatar } from '@/components/contact/ContactAvatar';

const SNAP_POINT = -80;

type SwipeableEventCardProps = {
  event: HotTopic & { contact: Contact };
  onPress: (contactId: string) => void;
  onDelete: (eventId: string) => void;
  isToday?: boolean;
};

export function SwipeableEventCard({ event, onPress, onDelete, isToday = false }: SwipeableEventCardProps) {
  const { t } = useTranslation();
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(68);
  const itemOpacity = useSharedValue(1);

  // For birthday events, use translated title instead of stored one
  const displayTitle = event.birthdayContactId
    ? t('upcoming.birthdayTitle', { firstName: event.contact.firstName })
    : event.title;

  const handleDelete = useCallback(() => {
    onDelete(event.id);
  }, [event.id, onDelete]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((gestureEvent) => {
      const newValue = Math.max(SNAP_POINT, Math.min(0, gestureEvent.translationX));
      translateX.value = newValue;
    })
    .onEnd((gestureEvent) => {
      if (gestureEvent.translationX < SNAP_POINT / 2) {
        translateX.value = withTiming(SNAP_POINT, { duration: 200 });
      } else {
        translateX.value = withTiming(0, { duration: 200 });
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    height: itemHeight.value,
    opacity: itemOpacity.value,
    marginBottom: interpolate(
      itemOpacity.value,
      [0, 1],
      [0, 8],
      Extrapolation.CLAMP
    ),
  }));

  const deleteButtonAnimatedStyle = useAnimatedStyle(() => {
    const deleteOpacity = interpolate(
      translateX.value,
      [-80, -40, 0],
      [1, 0.5, 0],
      Extrapolation.CLAMP
    );
    return {
      opacity: deleteOpacity,
    };
  });

  const handlePress = useCallback(() => {
    onPress(event.contactId);
  }, [event.contactId, onPress]);

  const handleDeletePress = useCallback(() => {
    translateX.value = withTiming(-300, { duration: 200 });
    itemHeight.value = withTiming(0, { duration: 200 });
    itemOpacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(handleDelete)();
    });
  }, [handleDelete, itemHeight, itemOpacity, translateX]);

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <Animated.View style={[styles.deleteButtonContainer, deleteButtonAnimatedStyle]}>
        <Pressable style={styles.deleteButton} onPress={handleDeletePress}>
          <Trash2 size={20} color={Colors.textInverse} />
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.eventCard, cardAnimatedStyle]}>
          <Pressable style={styles.cardPressable} onPress={handlePress}>
            <View style={[styles.eventAvatarFrame, isToday && styles.eventAvatarFrameToday]}>
              <ContactAvatar
                firstName={event.contact.firstName}
                lastName={event.contact.lastName}
                gender={event.contact.gender}
                avatarUrl={event.contact.avatarUrl}
                cacheKey={event.contact.updatedAt}
                recyclingKey={`upcoming-${event.id}`}
                size="tiny"
              />
            </View>
            <View style={styles.eventContent}>
              <Text style={styles.eventTitle}>{displayTitle}</Text>
              <Text style={styles.eventContact}>
                {event.contact.firstName} {event.contact.lastName || ''}
              </Text>
            </View>
            <ChevronRight size={14} color={Colors.textMuted} />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: Colors.error,
    width: 60,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    ...Shadows.card,
  },
  cardPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  eventAvatarFrame: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  eventAvatarFrameToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  eventContact: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
