import { useState, useRef } from "react";
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
  const [indicatorX, setIndicatorX] = useState(0);
  const [indicatorWidth, setIndicatorWidth] = useState(0);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const widthAnim = useRef(new Animated.Value(0)).current;

  const handleLayout = (id, event) => {
    if (id !== value) return;
    const { x, width } = event.nativeEvent.layout;
    setIndicatorX(x);
    setIndicatorWidth(width);
    Animated.parallel([
      Animated.spring(indicatorAnim, { toValue: x, useNativeDriver: false }),
      Animated.spring(widthAnim, { toValue: width, useNativeDriver: false }),
    ]).start();
  };

  const handleSelect = (id, event) => {
    const { x, width } = event.nativeEvent.layout;
    Animated.parallel([
      Animated.spring(indicatorAnim, {
        toValue: x,
        useNativeDriver: false,
        tension: 120,
        friction: 10,
      }),
      Animated.spring(widthAnim, {
        toValue: width,
        useNativeDriver: false,
        tension: 120,
        friction: 10,
      }),
    ]).start();
    if (onChange) onChange(id);
  };

  return (
    <View style={[styles.container, center && styles.center]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
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
            onPress={(e) =>
              handleSelect(
                item.id,
                e.nativeEvent
                  ? e
                  : {
                      nativeEvent: {
                        layout: { x: indicatorX, width: indicatorWidth },
                      },
                    },
              )
            }
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
  center: {
    alignItems: "center",
  },
  scrollContent: {
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: 0,
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
