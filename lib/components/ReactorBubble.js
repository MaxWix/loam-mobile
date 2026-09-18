import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  Pressable,
} from "react-native";
import { colors, fonts } from "../theme";

const EDGE = 12; // min distance from screen edges
const GAP = 6; // space between tail tip and the reaction
const TAIL = 7;
const AUTO_HIDE_MS = 2500;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export function formatReactorNames(names) {
  if (names.length <= 2) return names.join(" & ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

// Pressable that reports its own on-screen position when tapped
export function MeasuredPressable({ onPress, children, style, ...rest }) {
  const ref = useRef(null);
  return (
    <Pressable
      ref={ref}
      collapsable={false}
      style={style}
      onPress={() =>
        ref.current?.measureInWindow((x, y, width, height) =>
          onPress?.({ x, y, width, height }),
        )
      }
      {...rest}
    >
      {children}
    </Pressable>
  );
}

// Chat bubble pointing down at `anchor` (window coords). Must be rendered
// inside a full-screen container (a Modal root) so coords line up.
export function ReactorBubble({ anchor, label, onDismiss }) {
  useEffect(() => {
    if (!anchor) return;
    const t = setTimeout(() => onDismiss?.(), AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [anchor, label]);

  if (!anchor || !label) return null;
  // Keyed so every new tap remounts and re-measures from scratch
  return (
    <BubbleInner
      key={`${anchor.x}-${anchor.y}-${label}`}
      anchor={anchor}
      label={label}
    />
  );
}

function BubbleInner({ anchor, label }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [size, setSize] = useState(null);

  useEffect(() => {
    if (!size) return;
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 260,
      friction: 16,
    }).start();
  }, [size]);

  const screenW = Dimensions.get("window").width;
  const w = size?.width ?? 0;
  const h = size?.height ?? 0;
  const centerX = anchor.x + anchor.width / 2;
  const left = clamp(centerX - w / 2, EDGE, screenW - w - EDGE);
  const top = anchor.y - h - TAIL - GAP;
  const tailLeft = clamp(
    centerX - left - TAIL,
    12,
    Math.max(12, w - 12 - TAIL * 2),
  );

  return (
    <Animated.View
      pointerEvents="none"
      onLayout={(e) => {
        if (!size) {
          const { width, height } = e.nativeEvent.layout;
          setSize({ width, height });
        }
      }}
      style={[
        styles.bubble,
        {
          left,
          top,
          opacity: size ? anim : 0,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 0],
              }),
            },
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.85, 1],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      <View style={[styles.tail, { left: tailLeft }]} />
    </Animated.View>
  );
}

// For places without their own full-screen Modal (PostCard in a feed).
// Tapping anywhere dismisses it.
export function ReactorBubbleOverlay({ anchor, label, onClose }) {
  return (
    <Modal
      visible={!!anchor}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <ReactorBubble anchor={anchor} label={label} onDismiss={onClose} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: "absolute",
    maxWidth: 220,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: colors.brown500,
    // organic, same family as the listen chip
    borderTopLeftRadius: 16,
    borderTopRightRadius: 13,
    borderBottomLeftRadius: 13,
    borderBottomRightRadius: 16,
  },
  label: {
    fontFamily: fonts.primaryBold,
    fontSize: 12,
    color: colors.white200,
  },
  tail: {
    position: "absolute",
    bottom: -TAIL + 1,
    width: TAIL * 2,
    height: TAIL * 2,
    backgroundColor: colors.brown500,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
    zIndex: -1,
  },
});
