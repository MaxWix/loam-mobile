import { TouchableOpacity, View, StyleSheet, Animated } from "react-native";
import { useRef } from "react";
import Svg, { Path } from "react-native-svg";
import { colors, spacing } from "../theme";

const BLOB_PATH =
  "M27.1704 2.56349C19.203 -2.03646 6.99049 -0.475621 2.39054 7.49173C-2.20941 15.4591 -0.0640839 26.6592 7.90326 31.2592C15.8706 35.8591 25.8445 32.3309 30.4444 24.3636C35.0444 16.3962 35.1377 7.16344 27.1704 2.56349Z";

const COLOR_OPTIONS = [
  { value: "F5F5E1", fill: colors.lime300, stroke: colors.lime500 },
  { value: "F5EDEB", fill: colors.clay100, stroke: colors.clay300 },
  { value: "ECEDE2", fill: colors.green100, stroke: colors.green300 },
  { value: "F3EEE4", fill: colors.brown100, stroke: colors.brown300 },
];

function Swatch({ option, selected, onPress }) {
  const scaleAnim = useRef(new Animated.Value(selected ? 1.15 : 1)).current;

  const handlePress = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.15,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
    onPress(option.value);
  };

  if (!selected && scaleAnim._value > 1) {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Svg width={34} height={34} viewBox="-2 -2 38 38" fill="none">
          <Path
            d={BLOB_PATH}
            fill={option.fill}
            stroke={selected ? option.stroke : "transparent"}
            strokeWidth={2}
          />
        </Svg>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function ColorPicker({ value, onChange }) {
  return (
    <View style={styles.container}>
      {COLOR_OPTIONS.map((option) => (
        <Swatch
          key={option.value}
          option={option}
          selected={value === option.value}
          onPress={onChange}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: spacing.md,
  },
});
