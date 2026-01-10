import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useCallback } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Calendar, Trash2 } from 'lucide-react-native';
import { Colors } from '@/constants/theme';
import { HotTopic, Contact } from '@/types';

const SNAP_POINT = -80;

type SwipeableEventCardProps = {
  event: HotTopic & { contact: Contact };
  onPress: (contactId: string) => void;
  onDelete: (eventId: string) => void;
};

export function SwipeableEventCard({ event, onPress, onDelete }: SwipeableEventCardProps) {
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(60);
  const itemOpacity = useSharedValue(1);

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
            <Calendar size={16} color={Colors.info} />
            <View style={styles.eventContent}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventContact}>
                {event.contact.firstName} {event.contact.lastName || ''}
              </Text>
            </View>
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
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  cardPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  eventContent: {
    marginLeft: 12,
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  eventContact: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
