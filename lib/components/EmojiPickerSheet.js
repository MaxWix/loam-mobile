import { useState, useEffect, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Pressable,
  Dimensions,
  PanResponder,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts, spacing } from "../theme";
import { useAuth } from "../stores/auth";
import EmojiColorPicker from "./EmojiColorPicker";
import {
  getEmojiKeys,
  resolveEmojiComponent,
  DEFAULT_EMOJI_TONE,
} from "../utils/emojiAssets";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;

// How far (px) or how fast (px/ms) a downward drag needs to be on release
// to count as "dismiss" rather than "snap back open."
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 1.2;

// Same thresholds, sideways: how far/fast a horizontal drag needs to be
// to settle on the other panel rather than springing back.
const PANEL_DISTANCE = SCREEN_WIDTH * 0.3;
const PANEL_VELOCITY = 0.4;

export default function EmojiPickerSheet({
  visible,
  onClose,
  onSelect,
  viewerEmojiTone,
  onToneChange,
}) {
  const { supabase, session } = useAuth();
  const [mounted, setMounted] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // 0 = emoji grid, 1 = skin tone settings. Tracked in state for the
  // header (which swaps title and button) and as an Animated.Value for
  // the panel slide, since the two need to move independently while a
  // drag is in progress.
  const [panel, setPanel] = useState(0);
  const panelX = useRef(new Animated.Value(0)).current;
  const panelStartValue = useRef(0);

  // Optimistic local copy so the checkmark moves the instant it's tapped,
  // rather than waiting on the round trip.
  const [tone, setTone] = useState(viewerEmojiTone ?? DEFAULT_EMOJI_TONE);
  useEffect(() => {
    if (viewerEmojiTone != null) setTone(viewerEmojiTone);
  }, [viewerEmojiTone]);

  const dragStartValue = useRef(0);

  const goToPanel = (next) => {
    setPanel(next);
    Animated.spring(panelX, {
      toValue: next * -SCREEN_WIDTH,
      useNativeDriver: true,
      tension: 90,
      friction: 14,
    }).start();
  };

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
          duration: 280,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          // Always reopen on the emoji grid — reaching for a reaction and
          // landing on settings would be a surprise.
          setPanel(0);
          panelX.setValue(0);
        }
      });
    }
  }, [visible]);

  const handleToneSelect = async (nextTone) => {
    if (nextTone === tone || !session?.user?.id) return;
    const previous = tone;
    setTone(nextTone);
    onToneChange?.(nextTone);

    const { error } = await supabase
      .from("profiles")
      .update({ emoji_skin_tone: nextTone })
      .eq("id", session.user.id);

    if (error) {
      setTone(previous);
      onToneChange?.(previous);
    }
  };

  const shouldCaptureDrag = (_, gestureState) =>
    gestureState.dy > 8 &&
    Math.abs(gestureState.dy) > Math.abs(gestureState.dx);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: shouldCaptureDrag,
      onMoveShouldSetPanResponderCapture: shouldCaptureDrag,
      onPanResponderTerminationRequest: () => true,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        slideAnim.stopAnimation((value) => {
          dragStartValue.current = value;
        });
      },
      onPanResponderMove: (_, gestureState) => {
        const next = dragStartValue.current + gestureState.dy;
        slideAnim.setValue(Math.max(0, next));
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldDismiss =
          gestureState.dy > DISMISS_DISTANCE ||
          gestureState.vy > DISMISS_VELOCITY;
        if (shouldDismiss) {
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
      },
    }),
  ).current;

  // Horizontal drags between panels. The dismiss responder above only
  // claims gestures where |dy| > |dx|, so sideways swipes fall through
  // to this one instead of fighting it.
  const panelResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        panelX.stopAnimation((value) => {
          panelStartValue.current = value;
        });
      },
      onPanResponderMove: (_, g) => {
        // Clamp to the two panels so it can't be dragged into empty space.
        const next = panelStartValue.current + g.dx;
        panelX.setValue(Math.max(-SCREEN_WIDTH, Math.min(0, next)));
      },
      onPanResponderRelease: (_, g) => {
        const startedOnSettings = panelStartValue.current <= -SCREEN_WIDTH / 2;
        let next = startedOnSettings ? 1 : 0;
        if (
          !startedOnSettings &&
          (g.dx < -PANEL_DISTANCE || g.vx < -PANEL_VELOCITY)
        ) {
          next = 1;
        } else if (
          startedOnSettings &&
          (g.dx > PANEL_DISTANCE || g.vx > PANEL_VELOCITY)
        ) {
          next = 0;
        }
        goToPanel(next);
      },
    }),
  ).current;

  if (!mounted) return null;

  const onSettings = panel === 1;

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
        {...panResponder.panHandlers}
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        collapsable={false}
      >
        <View style={styles.sheetHandle} collapsable={false} />

        <View style={styles.sheetHeader} collapsable={false}>
          <Text style={styles.sheetTitle}>
            {onSettings ? "Emoji color" : "React"}
          </Text>
          {/* Same lopsided blob as the reaction and comment buttons on a
              post card, so the control reads as part of the same family. */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => goToPanel(onSettings ? 0 : 1)}
            accessibilityLabel={
              onSettings ? "Back to reactions" : "Emoji color settings"
            }
            hitSlop={8}
          >
            <MaterialIcons
              name={onSettings ? "arrow-back" : "settings"}
              size={20}
              color={colors.brown500}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.panelViewport} collapsable={false}>
          <Animated.View
            {...panelResponder.panHandlers}
            style={[styles.panelTrack, { transform: [{ translateX: panelX }] }]}
            collapsable={false}
          >
            <View style={styles.panel} collapsable={false}>
              <View style={styles.grid} collapsable={false}>
                {getEmojiKeys().map((emojiKey) => {
                  const EmojiIcon = resolveEmojiComponent(emojiKey, tone);
                  return (
                    <TouchableOpacity
                      key={emojiKey}
                      style={styles.emojiBtn}
                      onPress={() => onSelect(emojiKey)}
                    >
                      {EmojiIcon ? <EmojiIcon width={28} height={28} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.panel} collapsable={false}>
              <Text style={styles.panelBlurb}>
                Pick the skin tone for your reactions. Saves as you tap.
              </Text>
              <EmojiColorPicker value={tone} onSelect={handleToneSelect} />
            </View>
          </Animated.View>
        </View>
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
    maxHeight: SCREEN_HEIGHT * 0.5,
    backgroundColor: colors.white200,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    shadowColor: colors.brown900,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brown200,
    alignSelf: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.brown900,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brown100,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 25,
  },
  // Clips the off-screen panel so it can't be seen or touched while the
  // other one is showing.
  panelViewport: {
    width: "100%",
    overflow: "hidden",
  },
  panelTrack: {
    flexDirection: "row",
    width: SCREEN_WIDTH * 2,
  },
  panel: {
    width: SCREEN_WIDTH,
    paddingHorizontal: spacing.lg,
  },
  panelBlurb: {
    fontFamily: fonts.primary,
    fontSize: 14,
    color: colors.brown500,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
