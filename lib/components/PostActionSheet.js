import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
  Dimensions,
  PanResponder,
} from "react-native";
import { colors, fonts, spacing } from "../theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;

// Same thresholds as CommentsSheet — how far (px) or how fast (px/ms,
// PanResponder's unit) a downward drag must be on release to dismiss
// rather than snap back.
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 1.2;

/**
 * Bottom action sheet. Slides up, dims the screen behind it, and closes on
 * backdrop tap, Cancel, Android back, or a downward swipe.
 *
 * Unlike CommentsSheet — which needs PanGestureHandler and
 * `simultaneousHandlers` to avoid fighting a native ScrollView for the
 * touch — there's nothing scrollable in here, so a plain PanResponder over
 * the whole sheet is enough and there's no gesture arbitration to do.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onClose
 * @param {string} [props.title] — optional heading under the drag handle
 * @param {Array<{ label: string, onPress: () => void, danger?: boolean, disabled?: boolean }>} props.actions
 */
export default function PostActionSheet({
  visible,
  onClose,
  title,
  actions = [],
}) {
  // Stays true past `visible` going false so the close animation can finish
  // before the Modal unmounts.
  const [mounted, setMounted] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const dragStartValue = useRef(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible]);

  const dismissOrSnapBack = (dy, vy) => {
    if (dy > DISMISS_DISTANCE || vy > DISMISS_VELOCITY) {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onClose();
      });
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    }
  };

  // Only steals an in-progress touch on a clear downward drag, so a press
  // that began on an action row still fires that row's onPress if the
  // finger doesn't actually move.
  const shouldCaptureDrag = (_, g) =>
    g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx);

  const panResponder = useRef(
    PanResponder.create({
      // Must be true, not false. RN only routes move events through the
      // responder chain once something has claimed the responder on touch
      // start — with false, a drag beginning on blank sheet space produced
      // no events at all, and swiping only worked if the touch happened to
      // start on a button (which claimed it, letting the capture handler
      // below steal it on move).
      //
      // Returning true here doesn't break those buttons: responder
      // negotiation runs child-first in the bubbling phase, so a
      // TouchableOpacity is always asked before this parent and wins the
      // tap. The sheet only claims touches no child wanted.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: shouldCaptureDrag,
      onMoveShouldSetPanResponderCapture: shouldCaptureDrag,
      // Don't surrender the gesture mid-drag once it's genuinely started.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        slideAnim.stopAnimation((value) => {
          dragStartValue.current = value;
        });
      },
      onPanResponderMove: (_, g) => {
        // Clamped at 0 so the sheet can't be dragged up past its resting
        // position — only down, toward dismissal.
        slideAnim.setValue(Math.max(0, dragStartValue.current + g.dy));
      },
      onPanResponderRelease: (_, g) => {
        dismissOrSnapBack(g.dy, g.vy);
      },
      onPanResponderTerminate: (_, g) => {
        dismissOrSnapBack(g.dy, g.vy);
      },
    }),
  ).current;

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.handle} />

        {title ? <Text style={styles.title}>{title}</Text> : null}

        {actions.map((action, i) => (
          <View key={action.label}>
            {i > 0 && <View style={styles.divider} />}
            <TouchableOpacity
              style={styles.item}
              onPress={action.onPress}
              disabled={action.disabled}
            >
              <Text style={[styles.itemText, action.danger && styles.danger]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white400,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    shadowColor: colors.brown900,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brown200,
    alignSelf: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.primaryBold,
    fontSize: 14,
    color: colors.brown500,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  item: {
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
  },
  itemText: {
    fontFamily: fonts.primary,
    fontSize: 15,
    color: colors.brown500,
  },
  danger: {
    color: colors.clay500,
  },
  divider: {
    height: 1,
    backgroundColor: colors.brown100,
    marginHorizontal: spacing.lg,
  },
  cancelButton: {
    marginTop: spacing.sm,
    paddingVertical: 16,
    alignItems: "center",
    borderTopWidth: 8,
    borderTopColor: colors.brown50,
  },
  cancelText: {
    fontFamily: fonts.primaryBold,
    fontSize: 15,
    color: colors.brown500,
  },
});
