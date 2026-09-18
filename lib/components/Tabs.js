import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
} from "react-native";
import { colors, typography, spacing } from "../theme";

export default function Tabs({ items, value, onChange, center = false }) {
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const widthAnim = useRef(new Animated.Value(0)).current;
  const layouts = useRef({});
  // Needed to keep the selected tab on screen when `value` changes from
  // outside — e.g. swiping a paired PagerView to a tab that's scrolled
  // out of view. Widths come from onLayout/onContentSizeChange rather
  // than being measured on demand, since scrollTo needs them synchronously.
  const scrollRef = useRef(null);
  const containerWidth = useRef(0);
  const contentWidth = useRef(0);

  const handleLayout = (id, event) => {
    const { x, width } = event.nativeEvent.layout;
    layouts.current[id] = { x, width };

    if (id === value) {
      indicatorAnim.setValue(x);
      widthAnim.setValue(width);
    }
  };

  // Drives the indicator off the `value` prop directly rather than off
  // the tap handler below, so it stays in sync whether `value` changed
  // because the user tapped a tab here or because something external
  // (e.g. swiping a paired PagerView) changed it.
  useEffect(() => {
    const layout = layouts.current[value];
    if (layout) {
      // Centre the selected tab, clamped so it can't scroll past either
      // end. Skipped entirely when everything already fits — otherwise
      // this would fight the `center` layout below.
      const maxScroll = Math.max(
        0,
        contentWidth.current - containerWidth.current,
      );
      if (maxScroll > 0) {
        const centred =
          layout.x + layout.width / 2 - containerWidth.current / 2;
        scrollRef.current?.scrollTo({
          x: Math.max(0, Math.min(centred, maxScroll)),
          animated: true,
        });
      }

      Animated.parallel([
        Animated.spring(indicatorAnim, {
          toValue: layout.x,
          useNativeDriver: false,
          tension: 120,
          friction: 10,
        }),
        Animated.spring(widthAnim, {
          toValue: layout.width,
          useNativeDriver: false,
          tension: 120,
          friction: 10,
        }),
      ]).start();
    }
    // layouts.current is a ref, intentionally not in deps — this should
    // only re-run when the selected tab changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleSelect = (id) => {
    if (onChange) onChange(id);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={(e) => {
          containerWidth.current = e.nativeEvent.layout.width;
        }}
        onContentSizeChange={(w) => {
          contentWidth.current = w;
        }}
        contentContainerStyle={[
          styles.scrollContent,
          center && styles.scrollCenter,
        ]}
      >
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            disabled={item.disabled}
            onLayout={(e) => handleLayout(item.id, e)}
            onPress={() => handleSelect(item.id)}
            style={styles.tab}
          >
            <Text
              style={[
                styles.tabText,
                value === item.id && styles.tabTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}

        <Animated.View
          style={[
            styles.indicator,
            {
              transform: [{ translateX: indicatorAnim }],
              width: widthAnim,
            },
          ]}
        />
      </ScrollView>

      <View style={styles.border} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  scrollContent: {
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: 0,
    position: "relative",
  },
  scrollCenter: {
    justifyContent: "center",
  },
  tab: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  tabText: {
    ...typography.hg14,
    color: colors.brown300,
  },
  tabTextActive: {
    color: colors.brown500,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 4,
    backgroundColor: colors.lime500,
    borderRadius: 2,
  },
  border: {
    height: 1,
    backgroundColor: colors.brown100,
    marginTop: -1,
  },
});
