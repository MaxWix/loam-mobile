import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, fonts } from "../theme";

// Ported directly from the web app's Branch.svelte
const COLOR_MAP = {
  F3EEE4: colors.brown300,
  F5EDEB: colors.clay300,
  ECEDE2: colors.green300,
  F5F5E1: colors.lime500,
  B6AFA3: "#B6AFA3",
  CFD0A3: "#CFD0A3",
  DCC0B5: "#DCC0B5",
  D9DACF: "#D9DACF",
};

const OUTLINE_MAP = {
  F3EEE4: colors.brown500,
  F5EDEB: "#9E5135",
  ECEDE2: "#42480E",
  F5F5E1: colors.lime900,
  B6AFA3: "#462B01",
  CFD0A3: "#AFB066",
  DCC0B5: "#9E5135",
  D9DACF: "#42480E",
};

// React Native doesn't support asymmetric percentage border-radius strings
// like the web ("55% 50% 52% 48%"), so this maps the same per-branch hash
// to four individual corner-radius pixel values instead, keeping each
// branch's shape visually distinct but stable across renders.
const RADIUS_SETS = [
  [30, 26, 28, 24],
  [34, 30, 24, 28],
  [24, 28, 30, 26],
  [28, 32, 24, 28],
  [26, 26, 24, 28],
  [32, 28, 28, 24],
];

function getRadiusSet(branchId) {
  const hash = (branchId || "")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return RADIUS_SETS[hash % RADIUS_SETS.length];
}

function getColorHex(colorValue) {
  return COLOR_MAP[colorValue] || `#${colorValue}` || "#CFD0A3";
}

function getOutlineHex(colorValue) {
  return OUTLINE_MAP[colorValue] || "#462B01";
}

export { getColorHex, getOutlineHex };

export default function BranchButton({
  branch,
  isSelected = false,
  onPress,
  isAdd = false,
  icon: Icon,
  disableTouch = false,
}) {
  const [tl, tr, br, bl] = getRadiusSet(branch?.id);
  const bgColor = isAdd
    ? colors.brown100
    : getColorHex(branch?.color || "B6AFA3");
  const outlineColor = getOutlineHex(branch?.color || "B6AFA3");

  const content = (
    <>
      <View
        style={[
          styles.shape,
          {
            backgroundColor: bgColor,
            borderTopLeftRadius: tl,
            borderTopRightRadius: tr,
            borderBottomRightRadius: br,
            borderBottomLeftRadius: bl,
          },
          isSelected && { borderWidth: 2, borderColor: outlineColor },
        ]}
      >
        {Icon ? (
          <Icon width={28} height={28} />
        ) : (
          <Text style={styles.emoji}>{isAdd ? "+" : branch?.emoji}</Text>
        )}
      </View>
      <Text
        style={[styles.label, isSelected && styles.labelBold]}
        numberOfLines={2}
      >
        {isAdd ? "add" : branch?.name}
      </Text>
    </>
  );

  // When a parent wants to drive all touch handling itself (e.g. a
  // PanResponder for drag-to-reorder), rendering a plain View here avoids
  // stacking a second, competing touch responder on top of it.
  if (disableTouch) {
    return <View style={styles.container}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {content}
    </TouchableOpacity>
  );
}

const SHAPE_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 6,
    width: 64,
  },
  shape: {
    width: SHAPE_SIZE,
    height: SHAPE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontFamily: fonts.primary,
    fontSize: 12,
    color: colors.brown500,
    textAlign: "center",
  },
  labelBold: {
    fontFamily: fonts.primaryBold,
  },
});
